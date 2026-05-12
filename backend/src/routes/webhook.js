'use strict';
const router = require('express').Router();
const leadProcessor = require('../services/leadProcessor');
const { query } = require('../lib/db');

router.post('/evolution', async (req, res) => {
  res.json({ received: true });

  try {
    const payload = req.body;
    const event = payload?.event || payload?.type;
    const instanceName = payload?.instance || payload?.instanceName;

    console.log(`[Webhook] event=${event}`);
    if (!instanceName) return;

    const eventNorm = (event || '').toLowerCase().replace(/[._]/g, '');

    if (eventNorm.includes('contactsupsert') || eventNorm.includes('contactsupdate')) {
      console.log(`[Contacts] payload.data sample: ${JSON.stringify(payload?.data)?.slice(0, 400)}`);
      const contacts = Array.isArray(payload?.data) ? payload.data : [];
      if (contacts.length) {
        const sessionResult = await query(
          'SELECT user_id, workspace_id FROM whatsapp_sessions WHERE instance_name = $1',
          [instanceName]
        );
        if (sessionResult.rows.length) {
          const { user_id: userId, workspace_id: workspaceId } = sessionResult.rows[0];
          for (const c of contacts) {
            if (c.id && c.lid) {
              const phone = c.id.replace(/@.*$/, '');
              const lid   = c.lid.replace(/@.*$/, '');
              if (phone && lid) {
                await query(
                  `INSERT INTO whatsapp_contacts (user_id, workspace_id, lid, phone, name, updated_at)
                   VALUES ($1, $2, $3, $4, $5, NOW())
                   ON CONFLICT (workspace_id, lid)
                   DO UPDATE SET phone = $4, name = COALESCE($5, whatsapp_contacts.name), updated_at = NOW()`,
                  [userId, workspaceId, lid, phone, c.name || c.notify || null]
                ).catch(() => {});
              }
            }
          }
          console.log(`[Contacts] Guardados ${contacts.filter(c => c.id && c.lid).length} mapeos LID→phone`);
        }
      }
      return;
    }

    const isMessage = ['messagesupsert', 'message', 'messages'].some(e => eventNorm.includes(e));
    if (!isMessage) return;

    const messages =
      payload?.data?.messages ||
      payload?.messages ||
      (payload?.data ? [payload.data] : []);

    for (const msg of messages) {
      try {
        await leadProcessor.processMessage(instanceName, msg);
      } catch (msgErr) {
        console.error('Error processing message:', msgErr.message);
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err.message);
  }
});

module.exports = router;
