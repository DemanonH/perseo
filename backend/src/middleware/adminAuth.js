'use strict';
const jwt = require('jsonwebtoken');
const { query } = require('../lib/db');

async function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido' });
  }
  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }

  try {
    const result = await query('SELECT is_admin FROM users WHERE id = $1', [decoded.userId]);
    if (!result.rows.length || !result.rows[0].is_admin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    req.userId      = decoded.userId;
    req.workspaceId = decoded.workspaceId;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Error de autenticación' });
  }
}

module.exports = adminAuth;
