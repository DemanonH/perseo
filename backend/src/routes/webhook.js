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

    // ── Contacts upsert: save LID → real phone mapping ──────────────
    if (eventNorm.includes('contactsupsert') || eventNorm.includes('contactsupdate')) {
      console.log(`[Contacts] payload.data sample: ${JSON.stringify(payload?.data)?.slice(0, 400)}`);
      const contacts = Array.isArray(payload?.data) ? payload.data : [];
      if (contacts.length) {
        const sessionResult = await query(
          'SELECT user_id FROM whatsapp_sessions WHERE instance_name = $1',
          [instanceName]
        );
        if (sessionResult.rows.length) {
          const userId = sessionResult.rows[0].user_id;
          for (const c of contacts) {
            // c.id is the real JID (e.g. 5491132012067@s.whatsapp.net)
            // c.lid is the LID (e.g. 68401766600950@lid)
            if (c.id && c.lid) {
              const phone = c.id.replace(/@.*$/, '');
              const lid   = c.lid.replace(/@.*$/, '');
              if (phone && lid) {
                await query(
                  `INSERT INTO whatsapp_contacts (user_id, lid, phone, name, updated_at)
                   VALUES ($1, $2, $3, $4, NOW())
                   ON CONFLICT (user_id, lid)
                   DO UPDATE SET phone = $3, name = COALESCE($4, whatsapp_contacts.name), updated_at = NOW()`,
                  [userId, lid, phone, c.name || c.notify || null]
                ).catch(() => {});
              }
            }
          }
          console.log(`[Contacts] Guardados ${contacts.filter(c => c.id && c.lid).length} mapeos LID→phone`);
        }
      }
      return;
    }

    // ── Messages ────────────────────────────────────────────────────
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
