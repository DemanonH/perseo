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
    const { upsertSession, subscribeWaba } = require('../services/metaWhatsapp');
    const session = await upsertSession(req.userId, req.workspaceId, {
      phoneNumberId: phone_number_id,
      wabaId: waba_id,
      accessToken: access_token,
      phoneNumber: phone_number,
      displayName: display_name,
    });
    // Suscribir la app al WABA para recibir webhooks de mensajes entrantes
    try { await subscribeWaba(waba_id, access_token); } catch (e) {
      console.warn('[Meta] subscribeWaba warning:', e.message);
    }
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

// ─── Embedded Signup: exchange code OR use access_token, then auto-detect ────
router.post('/meta/embedded-signup', auth, async (req, res) => {
  const https = require('https');
  const logger = require('../lib/logger');

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
    const { access_token, code, redirect_uri } = req.body;

    let token = access_token;

    // ── Exchange code for token if provided ──────────────────────────────
    if (code && !token) {
      const appId     = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;

      logger.wa(`[EmbeddedSignup] Exchanging code for token (app ${appId?.slice(0,8)}…)`);

      if (!appId || !appSecret) {
        logger.warn('[EmbeddedSignup] META_APP_ID or META_APP_SECRET not set — cannot exchange code');
        return res.status(500).json({
          message: 'El servidor no tiene META_APP_ID / META_APP_SECRET configurados. Contactá al administrador.',
          needs_manual: true,
        });
      }

      const callbackUrl = redirect_uri || `${process.env.APP_URL || 'http://localhost:3000'}/auth/meta/callback`;
      const tokenPath   = `/v22.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(callbackUrl)}&code=${encodeURIComponent(code)}`;
      const tokenRes    = await graphGet(tokenPath);

      logger.wa(`[EmbeddedSignup] Token exchange response: ${JSON.stringify(tokenRes).slice(0,120)}`);

      if (tokenRes.error) {
        return res.status(400).json({
          message: `Error al intercambiar código con Meta: ${tokenRes.error.message || JSON.stringify(tokenRes.error)}`,
          needs_manual: true,
        });
      }
      token = tokenRes.access_token;
    }

    if (!token) return res.status(400).json({ message: 'access_token o code son requeridos' });

    // 1. Get user's WhatsApp Business Accounts
    // With standard Facebook OAuth (not Embedded Signup) the correct path is
    // /me/businesses → owned_whatsapp_business_accounts.
    // The old /me/whatsapp_business_accounts edge only works with System User tokens.
    logger.wa(`[EmbeddedSignup] Fetching WABA accounts via /me/businesses…`);

    const phoneFields = 'id,display_phone_number,verified_name,code_verification_status';
    const wabaFields  = `id,name,phone_numbers{${phoneFields}}`;
    const bizRes = await graphGet(
      `/v22.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{${wabaFields}}&access_token=${encodeURIComponent(token)}`
    );

    logger.wa(`[EmbeddedSignup] Businesses response: ${JSON.stringify(bizRes).slice(0, 300)}`);

    if (bizRes.error) {
      return res.status(400).json({
        message: bizRes.error.message || 'Error consultando Meta Graph API',
        needs_manual: true,
      });
    }

    // Flatten: business[] → waba[] → phone[]
    const accounts = [];
    for (const biz of (bizRes.data || [])) {
      for (const waba of (biz.owned_whatsapp_business_accounts?.data || [])) {
        accounts.push({
          waba_id:   waba.id,
          waba_name: waba.name || biz.name,
          phones: (waba.phone_numbers?.data || []).map(p => ({
            phone_number_id: p.id,
            phone_number:    p.display_phone_number,
            verified_name:   p.verified_name,
            verified:        p.code_verification_status === 'VERIFIED',
          })),
        });
      }
    }

    if (!accounts.length) {
      logger.warn('[EmbeddedSignup] No WABA accounts found for this token');
      return res.json({
        success:      false,
        needs_manual: true,
        message:      'No se encontraron cuentas de WhatsApp Business. Ingresá los datos manualmente.',
        access_token: token,
      });
    }

    // Count total phone lines
    const allPhones = accounts.flatMap(a => a.phones.map(p => ({ ...p, waba_id: a.waba_id, waba_name: a.waba_name })));
    logger.wa(`[EmbeddedSignup] Found ${accounts.length} WABA(s), ${allPhones.length} phone(s)`);

    if (allPhones.length === 1) {
      // Auto-connect the only phone
      const p = allPhones[0];
      logger.wa(`[EmbeddedSignup] Auto-connecting: ${p.phone_number} (${p.phone_number_id})`);
      const { upsertSession, subscribeWaba } = require('../services/metaWhatsapp');
      const session = await upsertSession(req.userId, req.workspaceId, {
        phoneNumberId: p.phone_number_id,
        wabaId:        p.waba_id,
        accessToken:   token,
        phoneNumber:   p.phone_number,
        displayName:   p.verified_name || p.waba_name,
      });
      logger.wa(`[EmbeddedSignup] Session saved: ${session.id}`);
      // Suscribir la app al WABA para recibir webhooks de mensajes entrantes
      try { await subscribeWaba(p.waba_id, token); } catch (e) {
        logger.warn(`[EmbeddedSignup] subscribeWaba warning: ${e.message}`);
      }
      return res.json({ success: true, auto_connected: true, session });
    }

    // Multiple phones — return list for user to pick
    logger.wa(`[EmbeddedSignup] Multiple phones found — returning for selection`);
    return res.json({
      success:          false,
      needs_selection:  true,
      access_token:     token,
      accounts,
    });

  } catch (err) {
    console.error('[EmbeddedSignup] error:', err);
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
    const { upsertSession, subscribeWaba } = require('../services/metaWhatsapp');
    const session = await upsertSession(req.userId, req.workspaceId, {
      phoneNumberId: phone_number_id,
      wabaId:        waba_id,
      accessToken:   access_token,
      phoneNumber:   phone_number,
      displayName:   display_name,
    });
    // Suscribir la app al WABA para recibir webhooks de mensajes entrantes
    try { await subscribeWaba(waba_id, access_token); } catch (e) {
      console.warn('[Meta] subscribeWaba warning:', e.message);
    }
    res.json({ success: true, session });
  } catch (err) {
    console.error('Meta select-phone error:', err);
    res.status(500).json({ message: 'Error al conectar el número: ' + err.message });
  }
});

module.exports = router;
