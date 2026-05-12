'use strict';
const router = require('express').Router();
const { query } = require('../lib/db');
const { processMetaMessage } = require('../services/leadProcessor');
const logger = require('../lib/logger');

router.post('/', async (req, res) => {
  res.sendStatus(200);

  let body;
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
    body = JSON.parse(raw);
  } catch {
    logger.warn('[360dialog] Webhook: cuerpo inválido');
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
          `SELECT user_id, workspace_id FROM dialog360_sessions
           WHERE is_active = true
           AND (channel_id = $1 OR phone_number LIKE $2)
           LIMIT 1`,
          [phoneNumberId, `%${phoneNumberId}%`]
        );

        let ownerId     = sessionRes.rows[0]?.user_id;
        let workspaceId = sessionRes.rows[0]?.workspace_id;

        if (!workspaceId) {
          const metaRes = await query(
            'SELECT user_id, workspace_id FROM meta_sessions WHERE phone_number_id = $1 AND is_active = true',
            [phoneNumberId]
          );
          ownerId     = metaRes.rows[0]?.user_id;
          workspaceId = metaRes.rows[0]?.workspace_id;
        }

        if (!workspaceId) {
          logger.warn(`[360dialog] Sin sesión para phone_number_id: ${phoneNumberId}`);
          continue;
        }

        for (const msg of (value.messages || [])) {
          const phone = msg.from;
          const text  =
            msg.text?.body        ||
            msg.image?.caption    ||
            msg.video?.caption    ||
            msg.document?.caption ||
            '';

          if (!text) continue;

          const contact = (value.contacts || []).find(c => c.wa_id === phone);
          const name    = contact?.profile?.name || null;

          logger.wa(`[360dialog] ← ${phone}${name ? ` (${name})` : ''}: "${text.slice(0, 60)}"`);
          await processMetaMessage(workspaceId, ownerId, { phone, name, text, fromMe: false });
        }
      }
    }
  } catch (err) {
    logger.error('[360dialog] Error procesando webhook:', err.message);
  }
});

module.exports = router;
