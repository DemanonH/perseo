'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const { query } = require('../lib/db');
const { processMetaMessage } = require('../services/leadProcessor');
const logger = require('../lib/logger');

// 360dialog usa el mismo formato de payload que Meta Cloud API
// Solo difiere en header de verificación: D360-Signature

// ─── POST / ───────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Responder 200 inmediatamente (igual que Meta)
  res.sendStatus(200);

  // Parsear body (viene como Buffer por express.raw)
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

        // Buscar sesión por phone_number_id — 360dialog envía el mismo phone_number_id de Meta
        // También puede venir como channel_id o api_key lookup
        const sessionRes = await query(
          `SELECT user_id FROM dialog360_sessions
           WHERE is_active = true
           AND (channel_id = $1 OR phone_number LIKE $2)
           LIMIT 1`,
          [phoneNumberId, `%${phoneNumberId}%`]
        );

        // Fallback: buscar en meta_sessions también (por si comparten phone_number_id)
        let userId = sessionRes.rows[0]?.user_id;
        if (!userId) {
          const metaRes = await query(
            'SELECT user_id FROM meta_sessions WHERE phone_number_id = $1 AND is_active = true',
            [phoneNumberId]
          );
          userId = metaRes.rows[0]?.user_id;
        }

        if (!userId) {
          logger.warn(`[360dialog] Sin sesión para phone_number_id: ${phoneNumberId}`);
          continue;
        }

        // Procesar mensajes — mismo formato que Meta
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
          await processMetaMessage(userId, { phone, name, text, fromMe: false });
        }
      }
    }
  } catch (err) {
    logger.error('[360dialog] Error procesando webhook:', err.message);
  }
});

module.exports = router;
