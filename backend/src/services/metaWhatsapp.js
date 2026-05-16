'use strict';
const https  = require('https');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

const GRAPH_VERSION = 'v22.0';

/**
 * Normaliza números de teléfono argentinos.
 * Meta deprecó el prefijo "9" móvil en Argentina:
 * 5491132012067 → 541132012067
 */
function _normalizePhone(phone) {
  // Remove any leading +
  const clean = phone.replace(/^\+/, '');
  // Argentina: 549 + area + number → 54 + area + number
  // e.g. 5491132012067 → 541132012067
  if (/^549\d{10}$/.test(clean)) {
    return '54' + clean.slice(3);
  }
  return clean;
}

/**
 * Enviar mensaje de texto via Meta WhatsApp Cloud API
 */
async function sendTextMessage(phoneNumberId, accessToken, toPhone, text) {
  const normalized = _normalizePhone(toPhone);
  if (normalized !== toPhone.replace(/^\+/, '')) {
    logger.wa(`[Meta] Normalized phone: ${toPhone} → ${normalized}`);
  }
  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalized,
    type: 'text',
    text: { preview_url: false, body: text },
  });

  logger.wa(`[Meta] → ${normalized}: "${text.slice(0, 60)}"`);
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

/**
 * Suscribir la app al WABA para recibir webhooks de mensajes.
 * Debe llamarse tras conectar/reconectar una sesión Meta.
 */
async function subscribeWaba(wabaId, accessToken) {
  logger.wa(`[Meta] Suscribiendo app al WABA ${wabaId}…`);
  const result = await _graphPost(`/${GRAPH_VERSION}/${wabaId}/subscribed_apps`, accessToken, '{}');
  if (result.success === true) {
    logger.ok(`[Meta] App suscrita al WABA ${wabaId} ✓`);
  } else {
    logger.warn(`[Meta] subscribed_apps response: ${JSON.stringify(result)}`);
  }
  return result;
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

module.exports = { sendTextMessage, getActiveSession, upsertSession, getTemplates, createTemplate, subscribeWaba };
