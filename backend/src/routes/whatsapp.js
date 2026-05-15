'use strict';
const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');
const evolution = require('../services/evolution');

router.post('/connect', auth, async (req, res) => {
  try {
    const { userId, workspaceId } = req;
    const instanceName = `perseo_${workspaceId.replace(/-/g, '')}`;
    const webhookUrl = `${process.env.BACKEND_URL}/webhook/evolution`;

    const existing = await query(
      'SELECT id FROM whatsapp_sessions WHERE workspace_id = $1',
      [workspaceId]
    );
    if (existing.rows.length) {
      await query(
        'UPDATE whatsapp_sessions SET status = $1, instance_name = $2 WHERE workspace_id = $3',
        ['connecting', instanceName, workspaceId]
      );
    } else {
      await query(
        'INSERT INTO whatsapp_sessions (user_id, workspace_id, instance_name, status) VALUES ($1, $2, $3, $4)',
        [userId, workspaceId, instanceName, 'connecting']
      );
    }

    try {
      const state = await evolution.getConnectionState(instanceName);
      if (state === 'open') {
        await query(
          'UPDATE whatsapp_sessions SET status = $1 WHERE workspace_id = $2',
          ['connected', workspaceId]
        );
        return res.json({ status: 'connected', instance: instanceName, qr: null });
      }
      try { await evolution.deleteInstance(instanceName); } catch (_) {}
    } catch (_) {}

    const result = await evolution.createInstance(instanceName, webhookUrl);

    const qr =
      result?.qrcode?.base64 ||
      result?.qrcode?.code   ||
      result?.base64         ||
      null;

    res.json({ qr, status: 'connecting', instance: instanceName });
  } catch (err) {
    console.error('WhatsApp connect error:', err.message);
    res.status(500).json({ message: 'Error al iniciar conexión con WhatsApp' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const session = await query(
      'SELECT instance_name, status FROM whatsapp_sessions WHERE workspace_id = $1',
      [req.workspaceId]
    );

    if (!session.rows.length) {
      return res.json({ status: 'disconnected' });
    }

    const { instance_name, status } = session.rows[0];

    try {
      const state = await evolution.getConnectionState(instance_name);
      const newStatus =
        state === 'open'       ? 'connected' :
        state === 'connecting' ? 'connecting' :
        'disconnected';

      if (newStatus !== status) {
        await query(
          'UPDATE whatsapp_sessions SET status = $1 WHERE workspace_id = $2',
          [newStatus, req.workspaceId]
        );
      }

      let qr = null;
      if (newStatus === 'connecting') {
        try {
          const qrResult = await evolution.getQR(instance_name);
          qr = qrResult?.base64 || qrResult?.qrcode?.base64 || null;
        } catch {}
      }

      return res.json({ status: newStatus, instance: instance_name, qr });
    } catch {
      return res.json({ status, instance: instance_name });
    }
  } catch (err) {
    console.error('WhatsApp status error:', err);
    res.status(500).json({ message: 'Error al obtener estado de WhatsApp' });
  }
});

router.post('/disconnect', auth, async (req, res) => {
  try {
    const session = await query(
      'SELECT instance_name FROM whatsapp_sessions WHERE workspace_id = $1',
      [req.workspaceId]
    );

    if (session.rows.length) {
      const { instance_name } = session.rows[0];
      try {
        await evolution.deleteInstance(instance_name);
      } catch (e) {
        console.warn('Evolution delete instance warning:', e.message);
      }
      await query(
        'UPDATE whatsapp_sessions SET status = $1 WHERE workspace_id = $2',
        ['disconnected', req.workspaceId]
      );
    }

    res.json({ status: 'disconnected' });
  } catch (err) {
    console.error('WhatsApp disconnect error:', err);
    res.status(500).json({ message: 'Error al desconectar WhatsApp' });
  }
});

// ─── Meta WhatsApp Cloud API ──────────────────────────────────────────────────

router.post('/meta/connect', auth, async (req, res) => {
  try {
    const { phone_number_id, waba_id, access_token, phone_number, display_name } = req.body;
    if (!phone_number_id || !waba_id || !access_token) {
      return res.status(400).json({ message: 'phone_number_id, waba_id y access_token son obligatorios' });
    }
    const { upsertSession } = require('../services/metaWhatsapp');
    const session = await upsertSession(req.userId, req.workspaceId, {
      phoneNumberId: phone_number_id,
      wabaId: waba_id,
      accessToken: access_token,
      phoneNumber: phone_number,
      displayName: display_name,
    });
    res.json({ success: true, session: { id: session.id, phone_number_id: session.phone_number_id, display_name: session.display_name } });
  } catch (err) {
    console.error('Meta connect error:', err);
    res.status(500).json({ message: 'Error al conectar sesión Meta' });
  }
});

router.get('/meta/status', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, phone_number_id, phone_number, display_name, is_active, created_at FROM meta_sessions WHERE workspace_id = $1 AND is_active = true',
      [req.workspaceId]
    );
    res.json({ connected: result.rows.length > 0, session: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estado Meta' });
  }
});

router.post('/meta/disconnect', auth, async (req, res) => {
  try {
    await query('UPDATE meta_sessions SET is_active = false WHERE workspace_id = $1', [req.workspaceId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error al desconectar sesión Meta' });
  }
});

// ─── Embedded Signup: auto-detect WABA + phone from user access token ─────────
router.post('/meta/embedded-signup', auth, async (req, res) => {
  const https = require('https');

  function graphGet(path) {
    return new Promise((resolve, reject) => {
      const req2 = https.request(
        { hostname: 'graph.facebook.com', path, method: 'GET' },
        (r) => { let d = ''; r.on('data', c => { d += c; }); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } }); }
      );
      req2.on('error', reject);
      req2.end();
    });
  }

  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ message: 'access_token es requerido' });

    // 1. Get user's WhatsApp Business Accounts
    const wabaRes = await graphGet(
      `/v22.0/me/whatsapp_business_accounts?fields=id,name,phone_numbers%7Bid,display_phone_number,verified_name,code_verification_status%7D&access_token=${encodeURIComponent(access_token)}`
    );

    if (wabaRes.error) {
      return res.status(400).json({
        message: wabaRes.error.message || 'Error consultando Meta Graph API',
        needs_manual: true,
      });
    }

    const accounts = (wabaRes.data || []).map(waba => ({
      waba_id:   waba.id,
      waba_name: waba.name,
      phones: (waba.phone_numbers?.data || []).map(p => ({
        phone_number_id:   p.id,
        phone_number:      p.display_phone_number,
        verified_name:     p.verified_name,
        verified: p.code_verification_status === 'VERIFIED',
      })),
    }));

    if (!accounts.length) {
      return res.json({
        success:      false,
        needs_manual: true,
        message:      'No se encontraron cuentas de WhatsApp Business. Ingresá los datos manualmente.',
        access_token,
      });
    }

    // Count total phone lines
    const allPhones = accounts.flatMap(a => a.phones.map(p => ({ ...p, waba_id: a.waba_id, waba_name: a.waba_name })));

    if (allPhones.length === 1) {
      // Auto-connect the only phone
      const p = allPhones[0];
      const { upsertSession } = require('../services/metaWhatsapp');
      const session = await upsertSession(req.userId, req.workspaceId, {
        phoneNumberId: p.phone_number_id,
        wabaId:        p.waba_id,
        accessToken:   access_token,
        phoneNumber:   p.phone_number,
        displayName:   p.verified_name || p.waba_name,
      });
      return res.json({ success: true, auto_connected: true, session });
    }

    // Multiple phones — return list for user to pick
    return res.json({
      success:          false,
      needs_selection:  true,
      access_token,
      accounts,
    });

  } catch (err) {
    console.error('Meta embedded-signup error:', err);
    res.status(500).json({ message: 'Error en la autenticación con Meta: ' + err.message, needs_manual: true });
  }
});

// ─── Connect a selected phone after embedded signup ───────────────────────────
router.post('/meta/select-phone', auth, async (req, res) => {
  try {
    const { phone_number_id, waba_id, access_token, phone_number, display_name } = req.body;
    if (!phone_number_id || !waba_id || !access_token) {
      return res.status(400).json({ message: 'phone_number_id, waba_id y access_token son requeridos' });
    }
    const { upsertSession } = require('../services/metaWhatsapp');
    const session = await upsertSession(req.userId, req.workspaceId, {
      phoneNumberId: phone_number_id,
      wabaId:        waba_id,
      accessToken:   access_token,
      phoneNumber:   phone_number,
      displayName:   display_name,
    });
    res.json({ success: true, session });
  } catch (err) {
    console.error('Meta select-phone error:', err);
    res.status(500).json({ message: 'Error al conectar el número: ' + err.message });
  }
});

module.exports = router;
