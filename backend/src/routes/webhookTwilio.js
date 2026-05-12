'use strict';
const express = require('express');
const router  = express.Router();
const { validateSignature } = require('../services/twilio');
const { query }  = require('../lib/db');
const logger = require('../lib/logger');
const { processMetaMessage } = require('../services/leadProcessor');

router.post('/', async (req, res) => {
  try {
    const signature = req.headers['x-twilio-signature'];
    const body      = req.body;

    const accountSid = body.AccountSid;
    if (!accountSid) {
      logger.warn('[TwilioWebhook] Sin AccountSid en payload');
      return res.status(400).send('Missing AccountSid');
    }

    const sessionRes = await query(
      'SELECT * FROM twilio_sessions WHERE account_sid = $1 AND is_active = true LIMIT 1',
      [accountSid]
    );
    const session = sessionRes.rows[0];
    if (!session) {
      logger.warn(`[TwilioWebhook] No hay sesión activa para AccountSid ${accountSid}`);
      return res.status(404).send('Session not found');
    }

    if (signature) {
      const APP_URL    = process.env.APP_URL || 'http://localhost:3000';
      const webhookUrl = `${APP_URL}/api/webhook/twilio`;
      const valid = validateSignature(session.auth_token, signature, webhookUrl, body);
      if (!valid) {
        logger.warn('[TwilioWebhook] Firma inválida');
        return res.status(403).send('Invalid signature');
      }
    }

    const fromRaw     = body.From    || '';
    const toRaw       = body.To      || '';
    const messageBody = body.Body    || '';
    const profileName = body.ProfileName || null;

    const fromPhone = fromRaw.replace(/^whatsapp:/, '');
    const toPhone   = toRaw.replace(/^whatsapp:/, '');

    if (!fromPhone || !messageBody) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    logger.wa(`[TwilioWebhook] ← ${fromPhone} → ${toPhone}: "${messageBody.slice(0, 60)}"`);

    await processMetaMessage(session.workspace_id, session.user_id, {
      phone:  fromPhone,
      name:   profileName,
      text:   messageBody,
      fromMe: false,
    });

    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (err) {
    logger.error('[TwilioWebhook] Error:', err.message);
    res.status(500).send('Internal error');
  }
});

module.exports = router;
