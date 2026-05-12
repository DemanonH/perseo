'use strict';
const express = require('express');
const router  = express.Router();
const authenticate = require('../middleware/auth');
const {
  getAccountInfo,
  getActiveSession,
  upsertSession,
  setWebhook,
} = require('../services/twilio');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

// ─── GET /status ─────────────────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
  try {
    const session = await getActiveSession(req.user.id);
    res.json({ connected: !!session, session: session || null });
  } catch (err) {
    logger.error('[Twilio] status error:', err.message);
    res.status(500).json({ message: 'Error al obtener estado de Twilio' });
  }
});

// ─── POST /connect ────────────────────────────────────────────────────────────
// Body: { account_sid, auth_token, phone_number, phone_number_sid?, display_name? }
router.post('/connect', authenticate, async (req, res) => {
  try {
    const { account_sid, auth_token, phone_number, phone_number_sid, display_name } = req.body;

    if (!account_sid || !auth_token || !phone_number) {
      return res.status(400).json({ message: 'account_sid, auth_token y phone_number son requeridos' });
    }

    // Validate credentials
    const info = await getAccountInfo(account_sid, auth_token);
    if (!info || info.status === 'suspended' || info.code) {
      const msg = info?.message || 'Credenciales de Twilio inválidas';
      return res.status(400).json({ message: msg });
    }

    // Register webhook if phoneNumberSid provided
    if (phone_number_sid) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000/api';
      const webhookUrl = `${backendUrl.replace('/api', '')}/api/webhook/twilio`;
      await setWebhook(account_sid, auth_token, phone_number_sid, webhookUrl);
      logger.ok(`[Twilio] Webhook registrado en ${phone_number_sid}`);
    }

    const session = await upsertSession(req.user.id, {
      accountSid:  account_sid,
      authToken:   auth_token,
      phoneNumber: phone_number,
      displayName: display_name || info.friendly_name || null,
    });

    logger.ok(`[Twilio] Usuario ${req.user.id} conectado → ${phone_number}`);
    res.json({ success: true, session });
  } catch (err) {
    logger.error('[Twilio] connect error:', err.message);
    res.status(500).json({ message: 'Error al conectar Twilio: ' + err.message });
  }
});

// ─── POST /disconnect ─────────────────────────────────────────────────────────
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE twilio_sessions SET is_active = false, updated_at = NOW() WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('[Twilio] disconnect error:', err.message);
    res.status(500).json({ message: 'Error al desconectar Twilio' });
  }
});

module.exports = router;
