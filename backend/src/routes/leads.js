'use strict';
const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');
const sheetsService = require('../services/sheets');
const logger = require('../lib/logger');

router.get('/', auth, async (req, res) => {
  try {
    const { campaign_id, score, temperature, month, status, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['l.workspace_id = $1'];
    const params = [req.workspaceId];
    let idx = 2;

    if (campaign_id)  { conditions.push(`l.campaign_id = $${idx++}`);      params.push(campaign_id); }
    if (score)        { conditions.push(`l.ai_score = $${idx++}`);          params.push(score); }
    if (temperature)  { conditions.push(`l.lead_temperature = $${idx++}`);  params.push(temperature); }
    if (status)       { conditions.push(`l.status = $${idx++}`);            params.push(status); }
    if (month) {
      conditions.push(`TO_CHAR(l.received_at, 'YYYY-MM') = $${idx++}`);
      params.push(month);
    }
    if (date_from) {
      conditions.push(`l.received_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      const dayAfter = new Date(new Date(date_to).getTime() + 86400000).toISOString().split('T')[0];
      conditions.push(`l.received_at < $${idx++}`);
      params.push(dayAfter);
    }

    const where = conditions.join(' AND ');
    const total = parseInt((await query(`SELECT COUNT(*) FROM leads l WHERE ${where}`, params)).rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(
      `SELECT l.*, c.name AS campaign_name, c.color AS campaign_color,
              (SELECT COUNT(*) FROM messages m WHERE m.lead_id = l.id) AS message_count
       FROM leads l
       LEFT JOIN campaigns c ON c.id = l.campaign_id
       WHERE ${where}
       ORDER BY l.received_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    res.json({ leads: result.rows, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Leads GET error:', err);
    res.status(500).json({ message: 'Error al obtener leads' });
  }
});

router.get('/metrics', auth, async (req, res) => {
  try {
    const wid = req.workspaceId;
    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);
    const { date_from, date_to } = req.query;

    const hasRange = date_from && date_to;
    const rangeEnd = hasRange
      ? new Date(new Date(date_to).getTime() + 86400000).toISOString().split('T')[0]
      : null;

    const periodQuery = hasRange
      ? query(`SELECT COUNT(*) FROM leads WHERE workspace_id = $1 AND received_at >= $2 AND received_at < $3`, [wid, date_from, rangeEnd])
      : query(`SELECT COUNT(*) FROM leads WHERE workspace_id = $1 AND DATE(received_at) = $2`, [wid, today]);

    const monthQuery = hasRange
      ? query(`SELECT COUNT(*) FROM leads WHERE workspace_id = $1 AND received_at >= $2 AND received_at < $3`, [wid, date_from, rangeEnd])
      : query(`SELECT COUNT(*) FROM leads WHERE workspace_id = $1 AND TO_CHAR(received_at,'YYYY-MM') = $2`, [wid, month]);

    const responseRateQuery = hasRange
      ? query(
          `SELECT
             COUNT(DISTINCT l.id) FILTER (WHERE l.received_at >= $2 AND l.received_at < $3) AS total_today,
             COUNT(DISTINCT l.id) FILTER (
               WHERE l.received_at >= $2 AND l.received_at < $3
               AND EXISTS (SELECT 1 FROM messages m WHERE m.lead_id = l.id AND m.from_me = true)
             ) AS responded_today
           FROM leads l WHERE l.workspace_id = $1`,
          [wid, date_from, rangeEnd]
        )
      : query(
          `SELECT
             COUNT(DISTINCT l.id) FILTER (WHERE DATE(l.received_at) = $2) AS total_today,
             COUNT(DISTINCT l.id) FILTER (
               WHERE DATE(l.received_at) = $2
               AND EXISTS (SELECT 1 FROM messages m WHERE m.lead_id = l.id AND m.from_me = true)
             ) AS responded_today
           FROM leads l WHERE l.workspace_id = $1`,
          [wid, today]
        );

    const [periodR, monthR, hotR, convertedR, activeCampsR, responseRateR, bestCampR] = await Promise.all([
      periodQuery,
      monthQuery,
      query(`SELECT COUNT(*) FROM leads WHERE workspace_id = $1 AND ai_score = 'CALIENTE'`, [wid]),
      query(`SELECT COUNT(*) FROM leads WHERE workspace_id = $1 AND status = 'converted'`, [wid]),
      query(`SELECT COUNT(*) FROM campaigns WHERE workspace_id = $1 AND is_active = true`, [wid]),
      responseRateQuery,
      query(
        `SELECT c.name, c.color, c.id,
                COUNT(l.id) AS total_leads,
                COUNT(l.id) FILTER (WHERE l.ai_score = 'CALIENTE') AS hot_leads
         FROM campaigns c
         LEFT JOIN leads l ON l.campaign_id = c.id AND l.received_at > NOW() - INTERVAL '30 days'
         WHERE c.workspace_id = $1 AND c.is_active = true
         GROUP BY c.id ORDER BY hot_leads DESC, total_leads DESC LIMIT 3`,
        [wid]
      ),
    ]);

    const rr = responseRateR.rows[0];
    const total_today = parseInt(rr.total_today || 0);
    const response_rate = total_today > 0
      ? Math.round((parseInt(rr.responded_today || 0) / total_today) * 100)
      : 0;

    res.json({
      today:            parseInt(periodR.rows[0].count),
      month:            parseInt(monthR.rows[0].count),
      hot:              parseInt(hotR.rows[0].count),
      converted:        parseInt(convertedR.rows[0].count),
      active_campaigns: parseInt(activeCampsR.rows[0].count),
      response_rate,
      best_campaigns:   bestCampR.rows,
      period_label:     hasRange ? `${date_from} → ${date_to}` : null,
    });
  } catch (err) {
    console.error('Leads metrics error:', err);
    res.status(500).json({ message: 'Error al obtener métricas' });
  }
});

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const check = await query(
      'SELECT id FROM leads WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );
    if (!check.rows.length) return res.status(404).json({ message: 'Lead no encontrado' });
    const result = await query(
      'SELECT * FROM messages WHERE lead_id = $1 ORDER BY received_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
});

router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ message: 'El mensaje no puede estar vacío' });

    const leadRes = await query(
      'SELECT * FROM leads WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );
    if (!leadRes.rows.length) return res.status(404).json({ message: 'Lead no encontrado' });
    const lead = leadRes.rows[0];
    const to   = lead.phone;
    let sent = false;

    // Priority: Meta → 360dialog → Twilio
    try {
      const metaSvc  = require('../services/metaWhatsapp');
      const metaSess = await metaSvc.getActiveSession(req.workspaceId);
      if (metaSess) {
        await metaSvc.sendTextMessage(metaSess.phone_number_id, metaSess.access_token, to, body.trim());
        sent = true;
      }
    } catch (e) { console.warn('[reply] Meta error:', e.message); }

    if (!sent) {
      try {
        const d360Svc  = require('../services/dialog360');
        const d360Sess = await d360Svc.getActiveSession(req.workspaceId);
        if (d360Sess) {
          await d360Svc.sendTextMessage(d360Sess.api_key, to, body.trim());
          sent = true;
        }
      } catch (e) { console.warn('[reply] 360dialog error:', e.message); }
    }

    if (!sent) {
      try {
        const twilioSvc  = require('../services/twilio');
        const twilioSess = await twilioSvc.getActiveSession(req.workspaceId);
        if (twilioSess) {
          await twilioSvc.sendTextMessage(twilioSess.account_sid, twilioSess.auth_token, twilioSess.phone_number, to, body.trim());
          sent = true;
        }
      } catch (e) { console.warn('[reply] Twilio error:', e.message); }
    }

    if (!sent) return res.status(400).json({ message: 'No hay proveedor de WhatsApp activo para enviar mensajes' });

    const msgRes = await query(
      `INSERT INTO messages (lead_id, user_id, body, from_me, received_at)
       VALUES ($1, $2, $3, true, NOW()) RETURNING *`,
      [lead.id, req.userId, body.trim()]
    );
    res.json(msgRes.rows[0]);
  } catch (err) {
    console.error('[reply] error:', err);
    res.status(500).json({ message: 'Error al enviar el mensaje: ' + err.message });
  }
});

router.patch('/:id/temperature', auth, async (req, res) => {
  try {
    const { temperature } = req.body;
    const validTemps = ['cold', 'warm', 'hot', null];
    if (!validTemps.includes(temperature ?? null)) {
      return res.status(400).json({ message: 'Temperatura inválida. Usar: cold, warm, hot o null' });
    }

    const result = await query(
      `UPDATE leads SET lead_temperature = $1, temperature_updated_at = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE temperature_updated_at END
       WHERE id = $2 AND workspace_id = $3 RETURNING *`,
      [temperature || null, req.params.id, req.workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Lead no encontrado' });
    const lead = result.rows[0];

    // Sync to Google Sheets (async, non-blocking)
    if (lead.sheet_row_index && lead.campaign_id) {
      (async () => {
        try {
          const [configRes, campRes] = await Promise.all([
            query('SELECT * FROM google_sheets_config WHERE workspace_id = $1 AND is_connected = true', [req.workspaceId]),
            query('SELECT sheet_tab, name FROM campaigns WHERE id = $1', [lead.campaign_id]),
          ]);
          if (!configRes.rows.length || !configRes.rows[0].spreadsheet_id || !campRes.rows.length) return;
          const cfg      = configRes.rows[0];
          const sheetTab = campRes.rows[0].sheet_tab || campRes.rows[0].name;
          const LABELS   = { hot: 'Caliente 🔥', warm: 'Tibio 🌡', cold: 'Frío ❄️' };
          const now      = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

          // Update "Temperatura" column (col 6) and timestamp (new col 9 if exists, else col 8)
          await sheetsService.updateCell(cfg, sheetTab, lead.sheet_row_index, 6, LABELS[temperature]);
          // Color the full row
          await sheetsService.colorRowByTemperature(cfg, sheetTab, lead.sheet_row_index, temperature);
          logger.sheet(`Lead ${lead.phone} → temperatura "${temperature}" sincronizada (fila ${lead.sheet_row_index})`);
        } catch (e) {
          logger.warn(`Sheets temperature sync failed: ${e.message}`);
        }
      })();
    }

    res.json(lead);
  } catch (err) {
    console.error('Lead temperature PATCH error:', err);
    res.status(500).json({ message: 'Error al actualizar temperatura' });
  }
});

router.patch('/:id/phone', auth, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d+$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ message: 'Número inválido' });
    }
    const cleaned = phone.replace(/\D/g, '');
    const dup = await query(
      'SELECT id FROM leads WHERE workspace_id = $1 AND phone = $2 AND id != $3',
      [req.workspaceId, cleaned, req.params.id]
    );
    if (dup.rows.length) {
      return res.status(409).json({ message: 'Ya existe un lead con ese número' });
    }
    const result = await query(
      `UPDATE leads SET phone = $1, phone_unresolved = false
       WHERE id = $2 AND workspace_id = $3 RETURNING *`,
      [cleaned, req.params.id, req.workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Lead no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Lead PATCH phone error:', err);
    res.status(500).json({ message: 'Error al actualizar número' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM leads WHERE id = $1 AND workspace_id = $2 RETURNING id, phone',
      [req.params.id, req.workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Lead no encontrado' });
    res.json({ success: true, phone: result.rows[0].phone });
  } catch (err) {
    console.error('Lead DELETE error:', err);
    res.status(500).json({ message: 'Error al eliminar lead' });
  }
});

router.post('/:id/convert', auth, async (req, res) => {
  try {
    const leadResult = await query(
      `UPDATE leads SET status = 'converted', converted_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND status = 'new' RETURNING *`,
      [req.params.id, req.workspaceId]
    );
    if (!leadResult.rows.length) return res.status(404).json({ message: 'Lead no encontrado o ya convertido' });
    const lead = leadResult.rows[0];

    if (lead.sheet_row_index && lead.campaign_id) {
      try {
        const [config, camp] = await Promise.all([
          query('SELECT * FROM google_sheets_config WHERE workspace_id = $1 AND is_connected = true', [req.workspaceId]),
          query('SELECT sheet_tab, name FROM campaigns WHERE id = $1', [lead.campaign_id]),
        ]);
        if (config.rows.length && config.rows[0].spreadsheet_id && camp.rows.length) {
          await sheetsService.updateCell(
            config.rows[0], camp.rows[0].sheet_tab || camp.rows[0].name, lead.sheet_row_index, 8, 'Convertido ✓'
          );
        }
      } catch (e) {
        console.warn('Sheet update on convert failed:', e.message);
      }
    }
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: 'Error al convertir lead' });
  }
});

module.exports = router;
