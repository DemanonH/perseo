'use strict';
const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');
const metaWhatsapp = require('../services/metaWhatsapp');

// GET /api/inbox — list conversations
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 40, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['l.workspace_id = $1'];
    const params = [req.workspaceId];
    let idx = 2;

    if (search) {
      conditions.push(`(l.name ILIKE $${idx} OR l.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');
    const totalRes = await query(`SELECT COUNT(*) FROM leads l WHERE ${where}`, params);
    const total = parseInt(totalRes.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(`
      SELECT
        l.id, l.phone, l.name, l.ai_score, l.status, l.received_at,
        l.lead_temperature, l.campaign_id,
        c.name  AS campaign_name,
        c.color AS campaign_color,
        lm.body        AS last_message,
        lm.from_me     AS last_from_me,
        lm.received_at AS last_message_at,
        (
          SELECT COUNT(*) FROM messages m2
          WHERE m2.lead_id = l.id AND m2.from_me = false
            AND m2.received_at > COALESCE(
              (SELECT MAX(m3.received_at) FROM messages m3
               WHERE m3.lead_id = l.id AND m3.from_me = true),
              '1970-01-01'
            )
        )::int AS unread_count,
        (SELECT COUNT(*) FROM messages m4 WHERE m4.lead_id = l.id)::int AS message_count
      FROM leads l
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      LEFT JOIN LATERAL (
        SELECT body, from_me, received_at
        FROM messages WHERE lead_id = l.id
        ORDER BY received_at DESC LIMIT 1
      ) lm ON true
      WHERE ${where}
      ORDER BY COALESCE(lm.received_at, l.received_at) DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, params);

    res.json({ conversations: result.rows, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Inbox GET error:', err);
    res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
});

// GET /api/inbox/:leadId/messages
router.get('/:leadId/messages', auth, async (req, res) => {
  try {
    const leadRes = await query(
      `SELECT l.*, c.name AS campaign_name, c.color AS campaign_color
       FROM leads l LEFT JOIN campaigns c ON c.id = l.campaign_id
       WHERE l.id = $1 AND l.workspace_id = $2`,
      [req.params.leadId, req.workspaceId]
    );
    if (!leadRes.rows.length) return res.status(404).json({ message: 'Conversación no encontrada' });

    const messages = await query(
      'SELECT * FROM messages WHERE lead_id = $1 ORDER BY received_at ASC',
      [req.params.leadId]
    );

    res.json({ lead: leadRes.rows[0], messages: messages.rows });
  } catch (err) {
    console.error('Inbox messages error:', err);
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
});

// POST /api/inbox/:leadId/reply
router.post('/:leadId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'El mensaje no puede estar vacío' });

    const leadRes = await query(
      'SELECT * FROM leads WHERE id = $1 AND workspace_id = $2',
      [req.params.leadId, req.workspaceId]
    );
    if (!leadRes.rows.length) return res.status(404).json({ message: 'Lead no encontrado' });
    const lead = leadRes.rows[0];

    const session = await metaWhatsapp.getActiveSession(req.workspaceId);
    if (!session) {
      return res.status(400).json({ message: 'No hay sesión de WhatsApp activa. Conectá Meta Cloud API primero.' });
    }

    const metaRes = await metaWhatsapp.sendTextMessage(
      session.phone_number_id, session.access_token, lead.phone, text.trim()
    );
    if (metaRes.error) {
      return res.status(400).json({ message: metaRes.error.message || 'Error al enviar mensaje por WhatsApp' });
    }

    const msgRes = await query(
      'INSERT INTO messages (lead_id, user_id, body, from_me) VALUES ($1, $2, $3, true) RETURNING *',
      [req.params.leadId, req.userId, text.trim()]
    );

    res.json({ message: msgRes.rows[0] });
  } catch (err) {
    console.error('Inbox reply error:', err);
    res.status(500).json({ message: 'Error al enviar mensaje' });
  }
});

module.exports = router;
