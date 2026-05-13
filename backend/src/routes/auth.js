'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../lib/db');

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, contraseña y nombre son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 12);
    const userResult = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, plan_id',
      [email.toLowerCase(), hash, name]
    );
    const user = userResult.rows[0];

    // Auto-create workspace for new user
    const wsResult = await query(
      `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id`,
      [`${name}'s Workspace`, user.id]
    );
    const workspaceId = wsResult.rows[0].id;

    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [workspaceId, user.id]
    );

    const token = jwt.sign(
      { userId: user.id, workspaceId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.status(201).json({ token, user: { ...user, workspaceId } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows.length) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const user = result.rows[0];

    if (user.suspended) {
      return res.status(403).json({ message: 'Tu cuenta ha sido suspendida. Contactá a soporte.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Get user's primary workspace (owner role first, fallback to any)
    const wsResult = await query(
      `SELECT workspace_id FROM workspace_members
       WHERE user_id = $1
       ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END
       LIMIT 1`,
      [user.id]
    );

    let workspaceId = wsResult.rows[0]?.workspace_id;

    // Edge case: user exists but has no workspace (legacy or error) — create one
    if (!workspaceId) {
      const ws = await query(
        `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id`,
        [`${user.name}'s Workspace`, user.id]
      );
      workspaceId = ws.rows[0].id;
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [workspaceId, user.id]
      );
    }

    // Track last login
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    const token = jwt.sign(
      { userId: user.id, workspaceId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan_id: user.plan_id,
        is_admin: user.is_admin || false,
        workspaceId,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
