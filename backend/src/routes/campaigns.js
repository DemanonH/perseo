const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              COUNT(l.id)                                              AS leads_count,
              COUNT(l.id) FILTER (WHERE l.ai_score = 'CALIENTE')      AS hot_count,
              COUNT(l.id) FILTER (WHERE l.ai_score = 'TIBIO')         AS warm_count,
              COUNT(l.id) FILTER (WHERE l.ai_score = 'FRIO')          AS cold_count,
              COUNT(l.id) FILTER (WHERE DATE(l.received_at) = CURRENT_DATE) AS today_count,
              json_agg(json_build_object('id', ck.id, 'keyword', ck.keyword, 'is_active', ck.is_active)
                ORDER BY ck.created_at)
                FILTER (WHERE ck.id IS NOT NULL)                       AS keywords
       FROM campaigns c
       LEFT JOIN leads l         ON l.campaign_id = c.id
       LEFT JOIN campaign_keywords ck ON ck.campaign_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Campaigns GET error:', err);
    res.status(500).json({ message: 'Error al obtener campañas' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, ad_id, color = '#F5A623', keywords = [] } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre de campaña es requerido' });

    const plan = await getUserPlan(req.userId);
    if (plan.max_campaigns !== -1) {
      const count = await query('SELECT COUNT(*) FROM campaigns WHERE user_id = $1', [req.userId]);
      if (parseInt(count.rows[0].count) >= plan.max_campaigns) {
        return res.status(403).json({
          message: `Tu plan permite máximo ${plan.max_campaigns} campañas. Actualizá tu plan para crear más.`
        });
      }
    }

    const camp = await query(
      `INSERT INTO campaigns (user_id, name, ad_id, color, sheet_tab)
       VALUES ($1, $2, $3, $4, $2) RETURNING *`,
      [req.userId, name.trim(), ad_id?.trim() || null, color]
    );
    const campaign = camp.rows[0];

    if (keywords.length) {
      for (const kw of keywords) {
        if (kw.trim()) {
          await query(
            'INSERT INTO campaign_keywords (campaign_id, user_id, keyword) VALUES ($1, $2, $3)',
            [campaign.id, req.userId, kw.trim().toLowerCase()]
          );
        }
      }
    }

    const full = await query(
      `SELECT c.*, json_agg(json_build_object('id', ck.id, 'keyword', ck.keyword, 'is_active', ck.is_active))
                    FILTER (WHERE ck.id IS NOT NULL) AS keywords
       FROM campaigns c
       LEFT JOIN campaign_keywords ck ON ck.campaign_id = c.id
       WHERE c.id = $1 GROUP BY c.id`,
      [campaign.id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error('Campaigns POST error:', err);
    res.status(500).json({ message: 'Error al crear campaña' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, ad_id, color, is_active } = req.body;
    const result = await query(
      `UPDATE campaigns
       SET name      = COALESCE($1, name),
           ad_id     = COALESCE($2, ad_id),
           color     = COALESCE($3, color),
           is_active = COALESCE($4, is_active),
           sheet_tab = COALESCE($1, name)
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name || null, ad_id || null, color || null, is_active !== undefined ? is_active : null, req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Campaña no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Campaigns PUT error:', err);
    res.status(500).json({ message: 'Error al actualizar campaña' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM campaigns WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Campaña no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Campaigns DELETE error:', err);
    res.status(500).json({ message: 'Error al eliminar campaña' });
  }
});

router.get('/:id/leads', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, score, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['l.user_id = $1', 'l.campaign_id = $2'];
    const params = [req.userId, req.params.id];
    let idx = 3;

    if (score)  { conditions.push(`l.ai_score = $${idx++}`); params.push(score); }
    if (status) { conditions.push(`l.status = $${idx++}`);   params.push(status); }

    const where = conditions.join(' AND ');
    const total = parseInt((await query(`SELECT COUNT(*) FROM leads l WHERE ${where}`, params)).rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(
      `SELECT l.*, (SELECT COUNT(*) FROM messages m WHERE m.lead_id = l.id) AS message_count
       FROM leads l WHERE ${where}
       ORDER BY l.received_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    res.json({ leads: result.rows, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Campaign leads error:', err);
    res.status(500).json({ message: 'Error al obtener leads de la campaña' });
  }
});

router.post('/:id/keywords', auth, async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ message: 'keyword es requerida' });
    const campCheck = await query('SELECT id FROM campaigns WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!campCheck.rows.length) return res.status(404).json({ message: 'Campaña no encontrada' });
    const result = await query(
      'INSERT INTO campaign_keywords (campaign_id, user_id, keyword) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.userId, keyword.trim().toLowerCase()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Campaign keywords POST error:', err);
    res.status(500).json({ message: 'Error al agregar keyword' });
  }
});

router.delete('/:id/keywords/:kwId', auth, async (req, res) => {
  try {
    await query(
      'DELETE FROM campaign_keywords WHERE id = $1 AND user_id = $2',
      [req.params.kwId, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar keyword' });
  }
});

async function getUserPlan(userId) {
  const result = await query(
    'SELECT p.* FROM plans p JOIN users u ON u.plan_id = p.id WHERE u.id = $1',
    [userId]
  );
  return result.rows[0] || { max_campaigns: 3, max_leads_monthly: 50, ai_scoring: false };
}

module.exports = router;
