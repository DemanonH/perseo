'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const { query } = require('../lib/db');
const { processMetaMessage } = require('../services/leadProcessor');
const logger = require('../lib/logger');

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'perseo_meta_verify_2024';
const APP_SECRET   = process.env.META_APP_SECRET;

// ─── GET: verificación del webhook por Meta ──────────────────────────────────
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

// ─── POST: mensajes entrantes de Meta ───────────────────────────────────────
router.post('/', async (req, res) => {
  // Verificar firma X-Hub-Signature-256
  if (APP_SECRET) {
    const sig = req.headers['x-hub-signature-256'];
    if (sig) {
      // req.body es Buffer porque usamos express.raw() upstream
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

  // Responder 200 de inmediato (Meta requiere respuesta rápida)
  res.sendStatus(200);

  // Parsear el body (viene como Buffer por express.raw)
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

        // Buscar qué usuario de Perseo tiene ese número
        const sessionRes = await query(
          'SELECT user_id FROM meta_sessions WHERE phone_number_id = $1 AND is_active = true',
          [phoneNumberId]
        );
        if (!sessionRes.rows.length) {
          logger.warn(`[Meta] Sin sesión registrada para phone_number_id: ${phoneNumberId}`);
          continue;
        }
        const userId = sessionRes.rows[0].user_id;

        // Procesar mensajes entrantes
        for (const msg of (value.messages || [])) {
          const phone = msg.from; // ← siempre número real, sin LID
          const text  =
            msg.text?.body          ||
            msg.image?.caption      ||
            msg.video?.caption      ||
            msg.document?.caption   ||
            '';

          if (!text) continue; // ignorar mensajes sin texto/caption

          const contact = (value.contacts || []).find(c => c.wa_id === phone);
          const name    = contact?.profile?.name || null;

          logger.wa(`[Meta] ← ${phone}${name ? ` (${name})` : ''}: "${text.slice(0, 60)}"`);
          await processMetaMessage(userId, { phone, name, text, fromMe: false });
        }
      }
    }
  } catch (err) {
    logger.error('[Meta] Error procesando webhook:', err.message);
  }
});

module.exports = router;
