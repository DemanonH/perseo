const router = require('express').Router();
const net = require('net');
const axios = require('axios');
const { pool } = require('../lib/db');
const { query } = require('../lib/db');

router.get('/', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', ts: new Date().toISOString() });
});

router.get('/full', async (req, res) => {
  const checks = {};
  const start = Date.now();

  await Promise.all([
    checkPostgres(checks),
    checkEvolution(checks),
    checkRedis(checks),
  ]);

  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const elapsed = Date.now() - start;

  res.status(200).json({
    status: allOk ? 'ok' : 'degraded',
    uptime_seconds: Math.floor(process.uptime()),
    check_ms: elapsed,
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    ts: new Date().toISOString(),
  });
});

router.get('/stats', async (req, res) => {
  try {
    const [users, leads, campaigns, messages] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM leads'),
      query('SELECT COUNT(*) FROM campaigns'),
      query('SELECT COUNT(*) FROM messages'),
    ]);
    res.json({
      users:     parseInt(users.rows[0].count),
      leads:     parseInt(leads.rows[0].count),
      campaigns: parseInt(campaigns.rows[0].count),
      messages:  parseInt(messages.rows[0].count),
    });
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener estadísticas' });
  }
});

async function checkPostgres(checks) {
  try {
    const t = Date.now();
    await pool.query('SELECT 1');
    checks.postgres = { status: 'ok', message: 'Conectado', ms: Date.now() - t };
  } catch (err) {
    checks.postgres = { status: 'error', message: err.message };
  }
}

async function checkEvolution(checks) {
  try {
    const t = Date.now();
    await axios.get(`${process.env.EVOLUTION_API_URL || 'http://evolution:8080'}/health`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY },
      timeout: 4000,
    });
    checks.evolution = { status: 'ok', message: 'Online', ms: Date.now() - t };
  } catch {
    checks.evolution = { status: 'error', message: 'No disponible' };
  }
}

function checkRedis(checks) {
  return new Promise(resolve => {
    const t = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.connect(6379, 'redis', () => {
      socket.destroy();
      checks.redis = { status: 'ok', message: 'Conectado', ms: Date.now() - t };
      resolve();
    });
    socket.on('error', () => {
      checks.redis = { status: 'error', message: 'No disponible' };
      resolve();
    });
    socket.on('timeout', () => {
      socket.destroy();
      checks.redis = { status: 'error', message: 'Timeout' };
      resolve();
    });
  });
}

module.exports = router;
