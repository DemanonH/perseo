'use strict';
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const { query } = require('../lib/db');
const dialog360 = require('../services/dialog360');
const logger  = require('../lib/logger');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${process.env.BACKEND_URL || APP_URL + '/api'}/webhook/dialog360`;

// ─── GET /connect-url ─────────────────────────────────────────────────────────
// Devuelve la URL del onboarding de 360dialog
router.get('/connect-url', auth, (req, res) => {
  try {
    const redirectUrl = `${APP_URL}/connect-whatsapp`;
    const url = dialog360.getPartnerConnectUrl(redirectUrl);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /connect ────────────────────────────────────────────────────────────
// Recibe client_id + channel_id del frontend tras el OAuth,
// o api_key directo para conexión manual
router.post('/connect', auth, async (req, res) => {
  try {
    const { client_id, channel_id, api_key: manualKey, phone_number, display_name } = req.body;

    if (!channel_id && !manualKey) {
      return res.status(400).json({ message: 'channel_id o api_key son requeridos' });
    }

    let apiKey = manualKey;

    // Si viene del OAuth flow, intercambiamos por el API key real
    if (!manualKey && client_id && channel_id) {
      const result = await dialog360.getApiKey(client_id, channel_id);
      apiKey = result.api_key || result.data?.api_key;
      if (!apiKey) return res.status(400).json({ message: 'No se pudo obtener el API key de 360dialog' });
    }

    // Registrar webhook en el canal
    try {
      await dialog360.setWebhook(apiKey, WEBHOOK_URL);
      logger.ok(`[360dialog] Webhook registrado: ${WEBHOOK_URL}`);
    } catch (e) {
      logger.warn(`[360dialog] No se pudo registrar webhook: ${e.message}`);
    }

    // Guardar sesión
    const session = await dialog360.upsertSession(req.userId, {
      channelId:   channel_id || `manual_${Date.now()}`,
      apiKey,
      phoneNumber: phone_number || null,
      displayName: display_name || null,
    });

    logger.ok(`[360dialog] Sesión conectada para user ${req.userId}`);
    res.json({ success: true, session: { id: session.id, channel_id: session.channel_id, phone_number: session.phone_number, display_name: session.display_name } });
  } catch (err) {
    logger.error('[360dialog] connect error:', err.message);
    res.status(500).json({ message: 'Error al conectar 360dialog' });
  }
});

// ─── GET /status ──────────────────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
  try {
    const r = await query(
      'SELECT id, channel_id, phone_number, display_name, is_active, created_at FROM dialog360_sessions WHERE user_id = $1 AND is_active = true LIMIT 1',
      [req.userId]
    );
    res.json({ connected: r.rows.length > 0, session: r.rows[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estado 360dialog' });
  }
});

// ─── POST /disconnect ─────────────────────────────────────────────────────────
router.post('/disconnect', auth, async (req, res) => {
  try {
    await query('UPDATE dialog360_sessions SET is_active = false WHERE user_id = $1', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error al desconectar 360dialog' });
  }
});

module.exports = router;
