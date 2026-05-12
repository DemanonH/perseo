const OpenAI = require('openai');
const { query } = require('../lib/db');
const sheetsService = require('./sheets');

const PROMPT_TEMPLATE = `Sos un asistente especializado en análisis de leads comerciales.
Analizá la siguiente conversación de WhatsApp entre un vendedor y un potencial cliente.
Clasificá el interés del lead en una de estas categorías:

CALIENTE: Mostró interés claro, preguntó precio, pidió disponibilidad, quiere comprar pronto.
TIBIO: Mostró algo de interés pero no tomó decisión, dijo que lo piensa, preguntó info general.
FRIO: No respondió, agradeció y cortó, dijo que no le interesa, lleva más de 24hs sin responder.

Conversación:
{conversacion}

Respondé únicamente con este JSON:
{"score": "CALIENTE|TIBIO|FRIO", "razon": "Una línea explicando por qué"}`;

async function scoreLead(lead, messages, apiKey) {
  const openai = new OpenAI({ apiKey });

  const conversation = messages
    .map(m => `${m.from_me ? 'Vendedor' : 'Lead'}: ${m.body}`)
    .join('\n');

  const prompt = PROMPT_TEMPLATE.replace('{conversacion}', conversation);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 150,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content;
  const parsed = JSON.parse(raw);

  if (!['CALIENTE', 'TIBIO', 'FRIO'].includes(parsed.score)) {
    throw new Error(`Score inválido: ${parsed.score}`);
  }

  return { score: parsed.score, razon: parsed.razon || '' };
}

async function scoreLeadsForUser(userId, apiKey, leads) {
  let processed = 0;
  let errors = 0;

  const config = await query(
    'SELECT * FROM google_sheets_config WHERE user_id = $1 AND is_connected = true',
    [userId]
  );
  const sheetConfig = config.rows[0] || null;

  for (const lead of leads) {
    try {
      const msgResult = await query(
        'SELECT * FROM messages WHERE lead_id = $1 ORDER BY received_at ASC',
        [lead.id]
      );
      if (!msgResult.rows.length) continue;

      const { score, razon } = await scoreLead(lead, msgResult.rows, apiKey);

      await query(
        `UPDATE leads
         SET ai_score = $1, ai_reason = $2, ai_scored_at = NOW()
         WHERE id = $3`,
        [score, razon, lead.id]
      );

      if (sheetConfig && sheetConfig.spreadsheet_id && lead.campaign_name && lead.sheet_row_index) {
        try {
          await sheetsService.updateCell(sheetConfig, lead.campaign_name, lead.sheet_row_index, 6, score);
          await sheetsService.updateCell(sheetConfig, lead.campaign_name, lead.sheet_row_index, 7, razon);
          await sheetsService.colorRow(sheetConfig, lead.campaign_name, lead.sheet_row_index, score);
        } catch (sheetErr) {
          console.warn(`Sheet update failed for lead ${lead.id}:`, sheetErr.message);
        }
      }

      processed++;
    } catch (err) {
      console.error(`Error scoring lead ${lead.id}:`, err.message);
      errors++;
    }
  }

  return { processed, errors };
}

module.exports = { scoreLead, scoreLeadsForUser };
