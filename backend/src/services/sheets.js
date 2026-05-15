const { google } = require('googleapis');

const HEADERS = ['Fecha', 'Nombre', 'Teléfono', 'Mensaje inicial', 'Campaña', 'Temperatura', 'Razón IA', 'Estado'];

const SCORE_COLORS = {
  CALIENTE: { red: 0.7, green: 0.93, blue: 0.7 },
  TIBIO:    { red: 1.0, green: 0.95, blue: 0.6 },
  FRIO:     { red: 0.95, green: 0.7, blue: 0.7 },
};

// Manual temperature colors (hot=red, warm=yellow, cold=gray)
const TEMPERATURE_COLORS = {
  hot:  { red: 0.96, green: 0.80, blue: 0.80 },  // rojo suave
  warm: { red: 1.00, green: 0.95, blue: 0.60 },  // amarillo
  cold: { red: 0.88, green: 0.88, blue: 0.92 },  // gris azulado
};

function buildAuthClient(config) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials({
    access_token: config.access_token,
    refresh_token: config.refresh_token,
  });
  return oauth2;
}

async function getOrCreateSheet(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets.find(
    (s) => s.properties.title === sheetName
  );
  if (existing) {
    return existing.properties.sheetId;
  }

  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });
  const newSheetId = addRes.data.replies[0].addSheet.properties.sheetId;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  return newSheetId;
}

async function appendRow(config, sheetName, values) {
  const auth = buildAuthClient(config);
  const sheets = google.sheets({ version: 'v4', auth });

  await getOrCreateSheet(sheets, config.spreadsheet_id, sheetName);

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheet_id,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });

  const updatedRange = appendRes.data.updates?.updatedRange || '';
  const match = updatedRange.match(/[A-Z]+(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

async function updateRow(config, sheetName, rowIndex, values) {
  const auth = buildAuthClient(config);
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheet_id,
    range: `'${sheetName}'!A${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

async function updateCell(config, sheetName, rowIndex, colIndex, value) {
  const auth = buildAuthClient(config);
  const sheets = google.sheets({ version: 'v4', auth });

  const col = String.fromCharCode(64 + colIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheet_id,
    range: `'${sheetName}'!${col}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
}

async function colorRow(config, sheetName, rowIndex, score) {
  const color = SCORE_COLORS[score];
  if (!color) return;

  const auth = buildAuthClient(config);
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetId = await getOrCreateSheet(sheets, config.spreadsheet_id, sheetName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheet_id,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: rowIndex - 1,
              endRowIndex: rowIndex,
              startColumnIndex: 0,
              endColumnIndex: HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: color,
              },
            },
            fields: 'userEnteredFormat.backgroundColor',
          },
        },
      ],
    },
  });
}

async function colorRowByTemperature(config, sheetName, rowIndex, temperature) {
  const color = TEMPERATURE_COLORS[temperature];
  if (!color) return;

  const auth = buildAuthClient(config);
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = await getOrCreateSheet(sheets, config.spreadsheet_id, sheetName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheet_id,
    requestBody: {
      requests: [{
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: rowIndex - 1,
            endRowIndex: rowIndex,
            startColumnIndex: 0,
            endColumnIndex: HEADERS.length,
          },
          cell: { userEnteredFormat: { backgroundColor: color } },
          fields: 'userEnteredFormat.backgroundColor',
        },
      }],
    },
  });
}

module.exports = { appendRow, updateRow, updateCell, colorRow, colorRowByTemperature, getOrCreateSheet };
