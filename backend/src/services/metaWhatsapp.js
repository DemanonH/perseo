'use strict';
const https  = require('https');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

const GRAPH_VERSION = 'v22.0';

/**
 * Enviar mensaje de texto via Meta WhatsApp Cloud API
 */
async function sendTextMessage(phoneNumberId, accessToken, toPhone, text) {
  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhone,
    type: 'text',
    text: { preview_url: false, body: text },
  });

  logger.wa(`[Meta] → ${toPhone}: "${text.slice(0, 60)}"`);
  return _graphPost(`/${GRAPH_VERSION}/${phoneNumberId}/messages`, accessToken, payload);
}

/**
 * Obtener la sesión Meta activa de un usuario
 */
async function getActiveSession(workspaceId) {
  const result = await query(
    'SELECT * FROM meta_sessions WHERE workspace_id = $1 AND is_active = true LIMIT 1',
    [workspaceId]
  );
  return result.rows[0] || null;
}

async function upsertSession(userId, workspaceId, { phoneNumberId, wabaId, accessToken, phoneNumber, displayName }) {
  const result = await query(
    `INSERT INTO meta_sessions (user_id, workspace_id, phone_number_id, waba_id, access_token, phone_number, display_name, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
     ON CONFLICT (phone_number_id)
     DO UPDATE SET
       user_id       = EXCLUDED.user_id,
       workspace_id  = EXCLUDED.workspace_id,
       waba_id       = EXCLUDED.waba_id,
       access_token  = EXCLUDED.access_token,
       phone_number  = EXCLUDED.phone_number,
       display_name  = EXCLUDED.display_name,
       is_active     = true,
       updated_at    = NOW()
     RETURNING *`,
    [userId, workspaceId, phoneNumberId, wabaId, accessToken, phoneNumber || null, displayName || null]
  );
  return result.rows[0];
}

async function getTemplates(wabaId, accessToken) {
  return _graphGet(
    `/${GRAPH_VERSION}/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`,
    accessToken
  );
}

async function createTemplate(wabaId, accessToken, templateData) {
  const payload = JSON.stringify(templateData);
  logger.wa(`[Meta] Creating template: ${templateData.name}`);
  return _graphPost(`/${GRAPH_VERSION}/${wabaId}/message_templates`, accessToken, payload);
}

function _graphGet(path, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data, status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function _graphPost(path, accessToken, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      path,
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${accessToken}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            logger.warn(`[Meta API] HTTP ${res.statusCode}:`, JSON.stringify(parsed.error || parsed));
          }
          resolve(parsed);
        } catch {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { sendTextMessage, getActiveSession, upsertSession, getTemplates, createTemplate };
