'use strict';
const router = require('express').Router();
const { google } = require('googleapis');
const auth = require('../middleware/auth');
const { query } = require('../lib/db');
const sheetsService = require('../services/sheets');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

router.get('/auth-url', auth, async (req, res) => {
  try {
    const oauth2 = getOAuth2Client();
    // Pass workspaceId in state so callback can look up the right config
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/spreadsheets'],
      state: req.workspaceId,
    });
    res.json({ url });
  } catch (err) {
    console.error('Sheets auth-url error:', err);
    res.status(500).json({ message: 'Error al generar URL de autorización' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state: workspaceId } = req.query;
    if (!code || !workspaceId) {
      return res.redirect('/sheets?error=missing_params');
    }

    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    const existing = await query(
      'SELECT id FROM google_sheets_config WHERE workspace_id = $1',
      [workspaceId]
    );

    if (existing.rows.length) {
      await query(
        `UPDATE google_sheets_config
         SET access_token = $1, refresh_token = COALESCE($2, refresh_token), is_connected = true
         WHERE workspace_id = $3`,
        [tokens.access_token, tokens.refresh_token || null, workspaceId]
      );
    } else {
      // Need user_id for FK; find workspace owner
      const ws = await query('SELECT owner_id FROM workspaces WHERE id = $1', [workspaceId]);
      const ownerId = ws.rows[0]?.owner_id;
      await query(
        `INSERT INTO google_sheets_config (user_id, workspace_id, access_token, refresh_token, is_connected)
         VALUES ($1, $2, $3, $4, true)`,
        [ownerId, workspaceId, tokens.access_token, tokens.refresh_token || null]
      );
    }

    const frontendUrl = process.env.APP_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/sheets?connected=true`);
  } catch (err) {
    console.error('Sheets callback error:', err);
    const frontendUrl = process.env.APP_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/sheets?error=oauth_failed`);
  }
});

router.post('/connect', auth, async (req, res) => {
  try {
    const { spreadsheet_id } = req.body;
    if (!spreadsheet_id) {
      return res.status(400).json({ message: 'spreadsheet_id es requerido' });
    }

    const existing = await query(
      'SELECT id FROM google_sheets_config WHERE workspace_id = $1',
      [req.workspaceId]
    );

    if (existing.rows.length) {
      await query(
        'UPDATE google_sheets_config SET spreadsheet_id = $1 WHERE workspace_id = $2',
        [spreadsheet_id.trim(), req.workspaceId]
      );
    } else {
      await query(
        'INSERT INTO google_sheets_config (user_id, workspace_id, spreadsheet_id) VALUES ($1, $2, $3)',
        [req.userId, req.workspaceId, spreadsheet_id.trim()]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Sheets connect error:', err);
    res.status(500).json({ message: 'Error al guardar spreadsheet' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT spreadsheet_id, is_connected FROM google_sheets_config WHERE workspace_id = $1',
      [req.workspaceId]
    );
    if (!result.rows.length) {
      return res.json({ is_connected: false, spreadsheet_id: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Sheets status error:', err);
    res.status(500).json({ message: 'Error al obtener estado de Sheets' });
  }
});

router.post('/test', auth, async (req, res) => {
  try {
    const config = await query(
      'SELECT * FROM google_sheets_config WHERE workspace_id = $1',
      [req.workspaceId]
    );
    if (!config.rows.length || !config.rows[0].is_connected) {
      return res.status(400).json({ message: 'Google Sheets no está conectado' });
    }
    if (!config.rows[0].spreadsheet_id) {
      return res.status(400).json({ message: 'No hay Spreadsheet configurado' });
    }

    const cfg = config.rows[0];
    await sheetsService.appendRow(cfg, 'Test', [
      new Date().toLocaleDateString('es-AR'),
      'Lead de Prueba',
      '+5491100000000',
      'Mensaje de prueba — fila de verificación',
      'Test',
      '',
      '',
      'Nuevo'
    ]);

    res.json({ success: true, message: 'Fila de prueba enviada correctamente' });
  } catch (err) {
    console.error('Sheets test error:', err);
    res.status(500).json({ message: `Error al escribir en Sheet: ${err.message}` });
  }
});

module.exports = router;
