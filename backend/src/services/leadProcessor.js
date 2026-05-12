'use strict';
const { query } = require('../lib/db');
const sheetsService = require('./sheets');
const logger = require('../lib/logger');

function extractPhone(jid) {
  if (!jid) return null;
  return jid.replace(/@.*$/, '').trim();
}

function extractText(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.body || msg?.text || ''
  );
}

async function findMatchingCampaign(workspaceId, text) {
  const keywords = await query(
    `SELECT ck.*, c.name AS campaign_name, c.id AS campaign_id, c.color, c.sheet_tab
     FROM campaign_keywords ck
     JOIN campaigns c ON c.id = ck.campaign_id
     WHERE ck.workspace_id = $1 AND ck.is_active = true AND c.is_active = true`,
    [workspaceId]
  );
  const lower = text.toLowerCase();
  for (const kw of keywords.rows) {
    if (lower.includes(kw.keyword)) {
      return { campaign_id: kw.campaign_id, campaign_name: kw.campaign_name, sheet_tab: kw.sheet_tab };
    }
  }
  return null;
}

async function resolveLid(workspaceId, lid) {
  const result = await query(
    'SELECT phone, name FROM whatsapp_contacts WHERE workspace_id = $1 AND lid = $2',
    [workspaceId, lid]
  );
  return result.rows[0] || null;
}

// ─── Core: create/update lead and message ─────────────────────────────────────
// workspaceId: isolation key for all queries
// ownerId: user_id FK value (workspace owner, for messages/leads FK)

async function _processIncoming(workspaceId, ownerId, phone, name, text, fromMe, phoneUnresolved = false) {
  if (!phone || !text) return;
  name = name || phone;

  let leadResult = await query(
    'SELECT * FROM leads WHERE workspace_id = $1 AND phone = $2',
    [workspaceId, phone]
  );

  let lead;
  let isNewLead = false;

  if (!leadResult.rows.length) {
    if (fromMe) return;
    const ins = await query(
      `INSERT INTO leads (user_id, workspace_id, phone, name, received_at, phone_unresolved)
       VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING *`,
      [ownerId, workspaceId, phone, name, phoneUnresolved]
    );
    lead = ins.rows[0];
    isNewLead = true;
    logger.lead(`Nuevo lead — ${name} (${phone})${phoneUnresolved ? ' [número sin resolver]' : ''}`);
  } else {
    lead = leadResult.rows[0];
    if (name && name !== phone && !lead.name) {
      await query('UPDATE leads SET name = $1 WHERE id = $2', [name, lead.id]);
      lead.name = name;
    }
  }

  await query(
    'INSERT INTO messages (lead_id, user_id, body, from_me) VALUES ($1, $2, $3, $4)',
    [lead.id, ownerId, text, fromMe]
  );
  logger.wa(`Mensaje ${fromMe ? '→' : '←'} ${phone}: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`);

  if (fromMe) return;

  if (!lead.campaign_id) {
    const match = await findMatchingCampaign(workspaceId, text);
    if (match) {
      await query('UPDATE leads SET campaign_id = $1 WHERE id = $2', [match.campaign_id, lead.id]);
      lead.campaign_id   = match.campaign_id;
      lead.campaign_name = match.campaign_name;
      lead.sheet_tab     = match.sheet_tab;
      await query('UPDATE campaigns SET leads_count = leads_count + 1 WHERE id = $1', [match.campaign_id]);
      logger.lead(`Lead ${phone} → campaña "${match.campaign_name}"`);
    }
  } else {
    const camp = await query('SELECT name, sheet_tab FROM campaigns WHERE id = $1', [lead.campaign_id]);
    if (camp.rows.length) {
      lead.campaign_name = camp.rows[0].name;
      lead.sheet_tab     = camp.rows[0].sheet_tab || camp.rows[0].name;
    }
  }

  if (isNewLead && lead.campaign_id) {
    await writeLeadToSheet(workspaceId, lead, text);
  }
}

// ─── Evolution (Baileys / QR code) ───────────────────────────────────────────

async function processMessage(instanceName, msg) {
  const sessionResult = await query(
    'SELECT user_id, workspace_id FROM whatsapp_sessions WHERE instance_name = $1',
    [instanceName]
  );
  if (!sessionResult.rows.length) return;
  const { user_id: ownerId, workspace_id: workspaceId } = sessionResult.rows[0];

  const remoteJid = msg?.key?.remoteJid || msg?.remoteJid || '';
  if (!remoteJid || remoteJid.includes('@g.us')) return;

  const fromMe  = msg?.key?.fromMe === true || msg?.fromMe === true;
  const isLid   = remoteJid.includes('@lid');
  let phone     = extractPhone(remoteJid);
  let name      = msg?.pushName || msg?.name || null;

  if (isLid) {
    const resolved = await resolveLid(workspaceId, phone);
    if (resolved) {
      phone = resolved.phone;
      name  = name || resolved.name;
      logger.lead(`LID ${extractPhone(remoteJid)} resuelto → ${phone}`);
    }
  }

  const text = extractText(msg);
  await _processIncoming(workspaceId, ownerId, phone, name, text, fromMe, isLid);
}

// ─── Meta WhatsApp Cloud API / 360dialog / Twilio ─────────────────────────────

async function processMetaMessage(workspaceId, ownerId, { phone, name, text, fromMe }) {
  return _processIncoming(workspaceId, ownerId, phone, name || null, text, fromMe || false, false);
}

// ─── Google Sheets ────────────────────────────────────────────────────────────

async function writeLeadToSheet(workspaceId, lead, firstMessage) {
  try {
    const config = await query(
      'SELECT * FROM google_sheets_config WHERE workspace_id = $1 AND is_connected = true',
      [workspaceId]
    );
    if (!config.rows.length || !config.rows[0].spreadsheet_id) return;

    const cfg      = config.rows[0];
    const sheetTab = lead.sheet_tab || lead.campaign_name;
    const dt = new Date(lead.received_at || Date.now());
    const fecha = dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                + ' ' + dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const rowIndex = await sheetsService.appendRow(cfg, sheetTab, [
      fecha, lead.name || lead.phone, lead.phone,
      firstMessage, lead.campaign_name || '', '', '', 'Nuevo',
    ]);

    if (rowIndex) {
      await query('UPDATE leads SET sheet_row_index = $1 WHERE id = $2', [rowIndex, lead.id]);
      logger.sheet(`Lead ${lead.phone} → Google Sheets "${sheetTab}" fila ${rowIndex}`);
    }
  } catch (err) {
    logger.warn(`No se pudo guardar en Google Sheets: ${err.message}`);
  }
}

module.exports = { processMessage, processMetaMessage };
