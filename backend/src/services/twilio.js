'use strict';
const https  = require('https');
const crypto = require('crypto');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

// ─── Verificar firma del webhook de Twilio ────────────────────────────────────
function validateSignature(authToken, signature, url, params) {
  const sortedKeys = Object.keys(params).sort();
  let str = url;
  for (const key of sortedKeys) str += key + (params[key] ?? '');
  const computed = crypto.createHmac('sha1', authToken).update(str).digest('base64');
  return computed === signature;
}

// ─── Enviar mensaje de texto via Twilio ───────────────────────────────────────
async function sendTextMessage(accountSid, authToken, from, to, body) {
  const payload = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To:   to.startsWith('whatsapp:')   ? to   : `whatsapp:${to}`,
    Body: body,
  }).toString();

  logger.wa(`[Twilio] → ${to}: "${body.slice(0, 60)}"`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twilio.com',
      path:     `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method:   'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) logger.warn(`[Twilio] HTTP ${res.statusCode}:`, parsed?.message);
          resolve(parsed);
        } catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Registrar webhook en el número de Twilio ─────────────────────────────────
// Requiere el PhoneNumberSid (empieza con PN...)
async function setWebhook(accountSid, authToken, phoneNumberSid, webhookUrl) {
  const payload = new URLSearchParams({
    SmsUrl:    webhookUrl,
    SmsMethod: 'POST',
  }).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twilio.com',
      path:     `/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
      method:   'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
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

// ─── Obtener info de la cuenta ────────────────────────────────────────────────
async function getAccountInfo(accountSid, authToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twilio.com',
      path:     `/2010-04-01/Accounts/${accountSid}.json`,
      method:   'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Sesión activa ────────────────────────────────────────────────────────────
async function getActiveSession(workspaceId) {
  const r = await query(
    'SELECT * FROM twilio_sessions WHERE workspace_id = $1 AND is_active = true LIMIT 1',
    [workspaceId]
  );
  return r.rows[0] || null;
}

async function upsertSession(userId, workspaceId, { accountSid, authToken, phoneNumber, displayName }) {
  const phone = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;
  const r = await query(
    `INSERT INTO twilio_sessions
       (user_id, workspace_id, account_sid, auth_token, phone_number, display_name, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
     ON CONFLICT (account_sid)
     DO UPDATE SET
       user_id      = EXCLUDED.user_id,
       workspace_id = EXCLUDED.workspace_id,
       auth_token   = EXCLUDED.auth_token,
       phone_number = EXCLUDED.phone_number,
       display_name = EXCLUDED.display_name,
       is_active    = true,
       updated_at   = NOW()
     RETURNING *`,
    [userId, workspaceId, accountSid, authToken, phone, displayName || null]
  );
  return r.rows[0];
}

module.exports = { validateSignature, sendTextMessage, setWebhook, getAccountInfo, getActiveSession, upsertSession };
