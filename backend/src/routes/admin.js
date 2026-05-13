'use strict';
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const adminAuth = require('../middleware/adminAuth');
const { query } = require('../lib/db');

// ─── GET /api/admin/metrics ────────────────────────────────────────────────────
router.get('/metrics', adminAuth, async (req, res) => {
  try {
    const [
      usersR, newUsersR, wsR, leadsR,
      activeWR, activeMR, activeD360R, activeTwilioR,
      plansR, subsR,
    ] = await Promise.all([
      query(`SELECT COUNT(*) FROM users WHERE NOT is_admin`),
      query(`SELECT COUNT(*) FROM users WHERE NOT is_admin AND created_at > NOW() - INTERVAL '30 days'`),
      query(`SELECT COUNT(*) FROM workspaces`),
      query(`SELECT COUNT(*) FROM leads WHERE received_at > NOW() - INTERVAL '30 days'`),
      query(`SELECT COUNT(*) FROM whatsapp_sessions WHERE status = 'connected'`),
      query(`SELECT COUNT(*) FROM meta_sessions WHERE is_active = true`),
      query(`SELECT COUNT(*) FROM dialog360_sessions WHERE is_active = true`),
      query(`SELECT COUNT(*) FROM twilio_sessions WHERE is_active = true`),
      query(`SELECT plan_id, COUNT(*) AS cnt FROM users WHERE NOT is_admin GROUP BY plan_id ORDER BY cnt DESC`),
      query(`
        SELECT
          COALESCE(SUM(p.price_monthly_cents) FILTER (WHERE s.status = 'active'), 0) AS mrr_cents,
          COUNT(s.id) FILTER (WHERE s.status = 'active') AS active_subs
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
      `),
    ]);

    const whatsapp_connected =
      parseInt(activeWR.rows[0].count) +
      parseInt(activeMR.rows[0].count) +
      parseInt(activeD360R.rows[0].count) +
      parseInt(activeTwilioR.rows[0].count);

    res.json({
      total_users:        parseInt(usersR.rows[0].count),
      new_users_30d:      parseInt(newUsersR.rows[0].count),
      total_workspaces:   parseInt(wsR.rows[0].count),
      leads_30d:          parseInt(leadsR.rows[0].count),
      whatsapp_connected,
      mrr_cents:          parseInt(subsR.rows[0].mrr_cents || 0),
      active_subs:        parseInt(subsR.rows[0].active_subs || 0),
      plan_distribution:  plansR.rows,
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    res.status(500).json({ message: 'Error al obtener métricas' });
  }
});

// ─── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, plan, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['NOT u.is_admin'];
    const params = [];
    let idx = 1;

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.email ILIKE $${idx} OR u.name ILIKE $${idx})`);
      idx++;
    }
    if (plan) {
      params.push(plan);
      conditions.push(`u.plan_id = $${idx++}`);
    }
    if (status === 'suspended') {
      conditions.push(`u.suspended = true`);
    } else if (status === 'active') {
      conditions.push(`u.suspended = false`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const total = parseInt(
      (await query(`SELECT COUNT(*) FROM users u ${where}`, params)).rows[0].count
    );

    const dataParams = [...params, parseInt(limit), offset];
    const result = await query(
      `SELECT
         u.id, u.email, u.name, u.plan_id, u.is_admin, u.suspended,
         u.created_at, u.last_login,
         ws.id AS workspace_id, ws.name AS workspace_name,
         (SELECT COUNT(*) FROM leads l WHERE l.workspace_id = ws.id) AS lead_count,
         (SELECT COUNT(*) FROM campaigns c WHERE c.workspace_id = ws.id) AS campaign_count,
         (SELECT COUNT(*) FROM messages m JOIN leads l ON l.id = m.lead_id WHERE l.workspace_id = ws.id AND m.received_at > NOW() - INTERVAL '7 days') AS messages_7d,
         COALESCE(
           (SELECT TRUE FROM whatsapp_sessions wh WHERE wh.workspace_id = ws.id AND wh.status = 'connected' LIMIT 1),
           (SELECT TRUE FROM meta_sessions ms WHERE ms.workspace_id = ws.id AND ms.is_active = true LIMIT 1),
           (SELECT TRUE FROM dialog360_sessions d3 WHERE d3.workspace_id = ws.id AND d3.is_active = true LIMIT 1),
           (SELECT TRUE FROM twilio_sessions tw WHERE tw.workspace_id = ws.id AND tw.is_active = true LIMIT 1),
           FALSE
         ) AS whatsapp_connected,
         (SELECT sub.status FROM subscriptions sub WHERE sub.user_id = u.id ORDER BY sub.created_at DESC LIMIT 1) AS sub_status
       FROM users u
       LEFT JOIN workspaces ws ON ws.owner_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataParams
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

// ─── GET /api/admin/connections ────────────────────────────────────────────────
router.get('/connections', adminAuth, async (req, res) => {
  try {
    const [evR, metaR, d360R, twilioR] = await Promise.all([
      query(`
        SELECT ws.instance_name, ws.status, ws.workspace_id,
               u.email AS owner_email, u.name AS owner_name, w.name AS workspace_name,
               ws.created_at, 'evolution' AS provider
        FROM whatsapp_sessions ws
        JOIN workspaces w ON w.id = ws.workspace_id
        JOIN users u ON u.id = w.owner_id
        ORDER BY ws.created_at DESC LIMIT 100
      `),
      query(`
        SELECT ms.phone_number_id, ms.phone_number, ms.display_name, ms.is_active,
               ms.workspace_id, ms.created_at, ms.updated_at,
               u.email AS owner_email, u.name AS owner_name, w.name AS workspace_name,
               'meta' AS provider
        FROM meta_sessions ms
        JOIN workspaces w ON w.id = ms.workspace_id
        JOIN users u ON u.id = w.owner_id
        ORDER BY ms.created_at DESC LIMIT 100
      `),
      query(`
        SELECT d.channel_id, d.phone_number, d.display_name, d.is_active,
               d.workspace_id, d.created_at,
               u.email AS owner_email, u.name AS owner_name, w.name AS workspace_name,
               '360dialog' AS provider
        FROM dialog360_sessions d
        JOIN workspaces w ON w.id = d.workspace_id
        JOIN users u ON u.id = w.owner_id
        ORDER BY d.created_at DESC LIMIT 100
      `),
      query(`
        SELECT t.account_sid, t.phone_number, t.display_name, t.is_active,
               t.workspace_id, t.created_at,
               u.email AS owner_email, u.name AS owner_name, w.name AS workspace_name,
               'twilio' AS provider
        FROM twilio_sessions t
        JOIN workspaces w ON w.id = t.workspace_id
        JOIN users u ON u.id = w.owner_id
        ORDER BY t.created_at DESC LIMIT 100
      `),
    ]);

    res.json({
      evolution: evR.rows,
      meta:      metaR.rows,
      dialog360: d360R.rows,
      twilio:    twilioR.rows,
    });
  } catch (err) {
    console.error('Admin connections error:', err);
    res.status(500).json({ message: 'Error al obtener conexiones' });
  }
});

// ─── GET /api/admin/activity ───────────────────────────────────────────────────
router.get('/activity', adminAuth, async (req, res) => {
  try {
    const result = await query(`
      (SELECT 'signup' AS type, u.name, u.email, u.created_at AS ts, u.plan_id AS meta
       FROM users u WHERE NOT u.is_admin ORDER BY u.created_at DESC LIMIT 10)
      UNION ALL
      (SELECT 'lead' AS type, u.name, u.email, l.received_at AS ts, l.ai_score AS meta
       FROM leads l JOIN users u ON u.id = l.user_id ORDER BY l.received_at DESC LIMIT 10)
      ORDER BY ts DESC LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener actividad' });
  }
});

// ─── PATCH /api/admin/users/:id/suspend ───────────────────────────────────────
router.patch('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    const { suspended } = req.body;
    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ message: 'suspended debe ser boolean' });
    }
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'No podés suspender tu propia cuenta' });
    }
    const result = await query(
      `UPDATE users SET suspended = $1 WHERE id = $2 RETURNING id, email, name, suspended`,
      [suspended, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin suspend error:', err);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
});

// ─── PATCH /api/admin/users/:id/plan ─────────────────────────────────────────
router.patch('/users/:id/plan', adminAuth, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const valid = ['free', 'starter', 'pro', 'agency'];
    if (!valid.includes(plan_id)) return res.status(400).json({ message: 'Plan inválido' });
    const result = await query(
      `UPDATE users SET plan_id = $1 WHERE id = $2 RETURNING id, email, name, plan_id`,
      [plan_id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar plan' });
  }
});

// ─── POST /api/admin/users/:id/impersonate ────────────────────────────────────
router.post('/users/:id/impersonate', adminAuth, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'No podés impersonarte a vos mismo' });
    }
    const userResult = await query(
      `SELECT u.id, u.email, u.name, u.plan_id, u.suspended,
              ws.id AS workspace_id
       FROM users u
       LEFT JOIN workspaces ws ON ws.owner_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!userResult.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const target = userResult.rows[0];
    if (target.suspended) return res.status(403).json({ message: 'El usuario está suspendido' });

    const token = jwt.sign(
      { userId: target.id, workspaceId: target.workspace_id, impersonatedBy: req.userId },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({
      token,
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        plan_id: target.plan_id,
        workspaceId: target.workspace_id,
        is_admin: false,
      },
    });
  } catch (err) {
    console.error('Impersonate error:', err);
    res.status(500).json({ message: 'Error al impersonar usuario' });
  }
});

module.exports = router;
