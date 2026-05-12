'use strict';
const https  = require('https');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

const PARTNER_ID    = process.env.DIALOG360_PARTNER_ID;
const PARTNER_TOKEN = process.env.DIALOG360_PARTNER_TOKEN;

// ─── Partner Connect URL ──────────────────────────────────────────────────────
// El cliente es redirigido acá para conectar su número
function getPartnerConnectUrl(redirectUrl) {
  if (!PARTNER_ID) throw new Error('DIALOG360_PARTNER_ID no configurado');
  return `https://hub.360dialog.com/dashboard/app/${PARTNER_ID}/permissions?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

// ─── Obtener API key de 360dialog via Partner API ─────────────────────────────
async function getApiKey(clientId, channelId) {
  if (!PARTNER_TOKEN || !PARTNER_ID) throw new Error('Credenciales 360dialog no configuradas');
  const payload = JSON.stringify({ client_id: clientId, channel_id: channelId });
  return _partnerPost(`/partners/${PARTNER_ID}/channels/${channelId}/api-keys`, payload);
}

// ─── Registrar webhook en el canal ────────────────────────────────────────────
async function setWebhook(apiKey, webhookUrl) {
  const payload = JSON.stringify({ url: webhookUrl });
  return _waba1Post('/configs/webhook', apiKey, payload);
}

// ─── Info del canal (número de teléfono, nombre) ──────────────────────────────
async function getChannelInfo(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'waba.360dialog.io',
      path: '/v1/configs/webhook',
      method: 'GET',
      headers: { 'D360-API-KEY': apiKey, 'Content-Type': 'application/json' },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Enviar mensaje de texto ──────────────────────────────────────────────────
async function sendTextMessage(apiKey, toPhone, text) {
  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to:   toPhone,
    type: 'text',
    text: { preview_url: false, body: text },
  });
  logger.wa(`[360dialog] → ${toPhone}: "${text.slice(0, 60)}"`);
  return _waba1Post('/messages', apiKey, payload);
}

// ─── Sesión activa ────────────────────────────────────────────────────────────
async function getActiveSession(workspaceId) {
  const r = await query(
    'SELECT * FROM dialog360_sessions WHERE workspace_id = $1 AND is_active = true LIMIT 1',
    [workspaceId]
  );
  return r.rows[0] || null;
}

async function upsertSession(userId, workspaceId, { channelId, apiKey, phoneNumber, displayName }) {
  const r = await query(
    `INSERT INTO dialog360_sessions
       (user_id, workspace_id, channel_id, api_key, phone_number, display_name, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
     ON CONFLICT (channel_id)
     DO UPDATE SET
       user_id      = EXCLUDED.user_id,
       workspace_id = EXCLUDED.workspace_id,
       api_key      = EXCLUDED.api_key,
       phone_number = EXCLUDED.phone_number,
       display_name = EXCLUDED.display_name,
       is_active    = true,
       updated_at   = NOW()
     RETURNING *`,
    [userId, workspaceId, channelId, apiKey, phoneNumber || null, displayName || null]
  );
  return r.rows[0];
}

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────

function _waba1Post(path, apiKey, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'waba.360dialog.io',
      path:     `/v1${path}`,
      method:   'POST',
      headers: {
        'D360-API-KEY':   apiKey,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) logger.warn(`[360dialog] HTTP ${res.statusCode}:`, JSON.stringify(parsed));
          resolve(parsed);
        } catch { resolve({ raw: data, status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function _partnerPost(path, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'stoplight.io',   // real: partners.360dialog.com
      path:     `/mocks/360dialog/360dialog-partner-api/24588693${path}`,
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${PARTNER_TOKEN}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { getPartnerConnectUrl, getApiKey, setWebhook, getChannelInfo, sendTextMessage, getActiveSession, upsertSession };
