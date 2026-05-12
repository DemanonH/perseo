'use strict';
const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { query } = require('../lib/db');

// GET /api/admin/metrics
router.get('/metrics', adminAuth, async (req, res) => {
  try {
    const [usersR, wsR, leadsR, activeR] = await Promise.all([
      query(`SELECT COUNT(*) FROM users`),
      query(`SELECT COUNT(*) FROM workspaces`),
      query(`SELECT COUNT(*) FROM leads`),
      query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'`),
    ]);
    res.json({
      total_users:      parseInt(usersR.rows[0].count),
      total_workspaces: parseInt(wsR.rows[0].count),
      total_leads:      parseInt(leadsR.rows[0].count),
      new_users_30d:    parseInt(activeR.rows[0].count),
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    res.status(500).json({ message: 'Error al obtener métricas' });
  }
});

// GET /api/admin/users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE u.email ILIKE $1 OR u.name ILIKE $1`;
    }

    const countParams = [...params];
    const total = parseInt(
      (await query(`SELECT COUNT(*) FROM users u ${where}`, countParams)).rows[0].count
    );

    params.push(parseInt(limit), offset);
    const idx = params.length;
    const result = await query(
      `SELECT u.id, u.email, u.name, u.plan_id, u.is_admin, u.suspended,
              u.created_at,
              (SELECT COUNT(*) FROM leads l
               JOIN workspaces w ON w.id = l.workspace_id
               WHERE w.owner_id = u.id) AS lead_count,
              (SELECT COUNT(*) FROM campaigns c
               JOIN workspaces w ON w.id = c.workspace_id
               WHERE w.owner_id = u.id) AS campaign_count,
              ws.id AS workspace_id, ws.name AS workspace_name
       FROM users u
       LEFT JOIN workspaces ws ON ws.owner_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    res.json({
      users: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// GET /api/admin/workspaces
router.get('/workspaces', adminAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT w.id, w.name, w.created_at,
              u.email AS owner_email, u.name AS owner_name, u.plan_id,
              COUNT(DISTINCT wm.user_id) AS member_count,
              COUNT(DISTINCT l.id) AS lead_count,
              COUNT(DISTINCT c.id) AS campaign_count
       FROM workspaces w
       JOIN users u ON u.id = w.owner_id
       LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
       LEFT JOIN leads l ON l.workspace_id = w.id
       LEFT JOIN campaigns c ON c.workspace_id = w.id
       GROUP BY w.id, u.id
       ORDER BY w.created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin workspaces error:', err);
    res.status(500).json({ message: 'Error al obtener workspaces' });
  }
});

// PATCH /api/admin/users/:id/suspend
router.patch('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    const { suspended } = req.body;
    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ message: 'suspended debe ser boolean' });
    }
    // Prevent self-suspension
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'No podés suspender tu propia cuenta' });
    }
    const result = await query(
      `UPDATE users SET suspended = $1 WHERE id = $2
       RETURNING id, email, name, suspended`,
      [suspended, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin suspend error:', err);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
});

// PATCH /api/admin/users/:id/plan
router.patch('/users/:id/plan', adminAuth, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const result = await query(
      `UPDATE users SET plan_id = $1 WHERE id = $2
       RETURNING id, email, name, plan_id`,
      [plan_id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar plan' });
  }
});

module.exports = router;
