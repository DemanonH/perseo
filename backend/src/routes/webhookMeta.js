'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const { query } = require('../lib/db');
const { processMetaMessage } = require('../services/leadProcessor');
const logger = require('../lib/logger');

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'perseo_meta_verify_2024';
const APP_SECRET   = process.env.META_APP_SECRET;

router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.ok('[Meta] Webhook verificado correctamente');
    return res.status(200).send(challenge);
  }
  logger.warn(`[Meta] Verificación fallida — token recibido: "${token}"`);
  res.sendStatus(403);
});

router.post('/', async (req, res) => {
  if (APP_SECRET) {
    const sig = req.headers['x-hub-signature-256'];
    if (sig) {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expected = 'sha256=' + crypto
        .createHmac('sha256', APP_SECRET)
        .update(rawBody)
        .digest('hex');
      if (sig !== expected) {
        logger.warn('[Meta] Webhook: firma inválida, rechazando');
        return res.sendStatus(403);
      }
    }
  }

  res.sendStatus(200);

  let body;
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
    body = JSON.parse(raw);
  } catch {
    logger.warn('[Meta] Webhook: cuerpo inválido');
    return;
  }

  if (body.object !== 'whatsapp_business_account') return;

  try {
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;

        const value         = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const sessionRes = await query(
          'SELECT user_id, workspace_id FROM meta_sessions WHERE phone_number_id = $1 AND is_active = true',
          [phoneNumberId]
        );
        if (!sessionRes.rows.length) {
          logger.warn(`[Meta] Sin sesión registrada para phone_number_id: ${phoneNumberId}`);
          continue;
        }
        const { user_id: ownerId, workspace_id: workspaceId } = sessionRes.rows[0];

        for (const msg of (value.messages || [])) {
          const phone = msg.from;
          const text  =
            msg.text?.body          ||
            msg.image?.caption      ||
            msg.video?.caption      ||
            msg.document?.caption   ||
            '';

          if (!text) continue;

          const contact = (value.contacts || []).find(c => c.wa_id === phone);
          const name    = contact?.profile?.name || null;

          logger.wa(`[Meta] ← ${phone}${name ? ` (${name})` : ''}: "${text.slice(0, 60)}"`);
          await processMetaMessage(workspaceId, ownerId, { phone, name, text, fromMe: false });
        }
      }
    }
  } catch (err) {
    logger.error('[Meta] Error procesando webhook:', err.message);
  }
});

module.exports = router;
