'use strict';
const express = require('express');
const router  = express.Router();
const auth = require('../middleware/auth');
const {
  getAccountInfo,
  getActiveSession,
  upsertSession,
  setWebhook,
} = require('../services/twilio');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

router.get('/status', auth, async (req, res) => {
  try {
    const session = await getActiveSession(req.workspaceId);
    res.json({ connected: !!session, session: session || null });
  } catch (err) {
    logger.error('[Twilio] status error:', err.message);
    res.status(500).json({ message: 'Error al obtener estado de Twilio' });
  }
});

router.post('/connect', auth, async (req, res) => {
  try {
    const { account_sid, auth_token, phone_number, phone_number_sid, display_name } = req.body;

    if (!account_sid || !auth_token || !phone_number) {
      return res.status(400).json({ message: 'account_sid, auth_token y phone_number son requeridos' });
    }

    const info = await getAccountInfo(account_sid, auth_token);
    if (!info || info.status === 'suspended' || info.code) {
      const msg = info?.message || 'Credenciales de Twilio inválidas';
      return res.status(400).json({ message: msg });
    }

    if (phone_number_sid) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000/api';
      const webhookUrl = `${backendUrl.replace('/api', '')}/api/webhook/twilio`;
      await setWebhook(account_sid, auth_token, phone_number_sid, webhookUrl);
      logger.ok(`[Twilio] Webhook registrado en ${phone_number_sid}`);
    }

    const session = await upsertSession(req.userId, req.workspaceId, {
      accountSid:  account_sid,
      authToken:   auth_token,
      phoneNumber: phone_number,
      displayName: display_name || info.friendly_name || null,
    });

    logger.ok(`[Twilio] Workspace ${req.workspaceId} conectado → ${phone_number}`);
    res.json({ success: true, session });
  } catch (err) {
    logger.error('[Twilio] connect error:', err.message);
    res.status(500).json({ message: 'Error al conectar Twilio: ' + err.message });
  }
});

router.post('/disconnect', auth, async (req, res) => {
  try {
    await query(
      'UPDATE twilio_sessions SET is_active = false, updated_at = NOW() WHERE workspace_id = $1',
      [req.workspaceId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('[Twilio] disconnect error:', err.message);
    res.status(500).json({ message: 'Error al desconectar Twilio' });
  }
});

module.exports = router;
