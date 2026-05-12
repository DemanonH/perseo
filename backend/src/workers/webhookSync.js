const axios = require('axios');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

const EVOLUTION_BASE = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
const EVOLUTION_KEY  = process.env.EVOLUTION_API_KEY  || '';
const WEBHOOK_URL    = `${process.env.BACKEND_URL || 'http://backend:3000/api'}/webhook/evolution`;

const EVENTS = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE'];

/**
 * On every backend startup, re-register the webhook for all connected instances.
 * This survives Evolution container restarts which wipe in-memory webhook config.
 */
async function restoreWebhooks() {
  // Give Evolution a moment to fully start
  await new Promise(r => setTimeout(r, 5000));

  const sessions = await query(
    "SELECT instance_name FROM whatsapp_sessions WHERE status IN ('connected', 'connecting')"
  );

  if (!sessions.rows.length) return;

  const client = axios.create({
    baseURL: EVOLUTION_BASE,
    headers: { apikey: EVOLUTION_KEY },
    timeout: 10000,
  });

  for (const { instance_name } of sessions.rows) {
    try {
      await client.post(`/webhook/set/${instance_name}`, {
        url: WEBHOOK_URL,
        webhookByEvents: false,
        events: EVENTS,
        enabled: true,
      });
      logger.ok(`Webhook restaurado → ${instance_name}`);
    } catch (err) {
      logger.warn(`No se pudo restaurar webhook para ${instance_name}: ${err.message}`);
    }
  }
}

module.exports = { restoreWebhooks };
