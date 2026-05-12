const { Pool } = require('pg');

const isSSL = process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.includes('sslmode=require') ||
   process.env.DATABASE_URL.includes('neon.tech') ||
   process.env.NODE_ENV === 'production');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err.message);
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('PostgreSQL connected');
  } finally {
    client.release();
  }
}

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn('Slow query detected:', { text: text.slice(0, 80), duration });
  }
  return res;
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, initDb, transaction, pool };
