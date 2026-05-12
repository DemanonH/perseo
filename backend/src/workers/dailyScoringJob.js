const cron = require('node-cron');
const { query } = require('../lib/db');
const { scoreLeadsForUser } = require('../services/aiScorer');

async function runDailyScoring() {
  console.log('[DailyScoring] Iniciando job de scoring...');
  const startTime = Date.now();

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    const leadsResult = await query(
      `SELECT l.*, u.openai_api_key
       FROM leads l
       JOIN users u ON u.id = l.user_id
       WHERE DATE(l.received_at) = $1
         AND (l.ai_scored_at IS NULL OR DATE(l.ai_scored_at) < $1)
         AND EXISTS (
           SELECT 1 FROM messages m WHERE m.lead_id = l.id
         )
       ORDER BY l.user_id, l.received_at`,
      [yesterdayDate]
    );

    if (!leadsResult.rows.length) {
      console.log('[DailyScoring] No hay leads para procesar.');
      return;
    }

    const byUser = {};
    for (const row of leadsResult.rows) {
      if (!row.openai_api_key && !process.env.OPENAI_API_KEY_FALLBACK) {
        console.warn(`[DailyScoring] Usuario ${row.user_id} sin API key de OpenAI, saltando.`);
        continue;
      }
      const apiKey = row.openai_api_key || process.env.OPENAI_API_KEY_FALLBACK;
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = { apiKey, leads: [] };
      }
      byUser[row.user_id].leads.push(row);
    }

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const [userId, { apiKey, leads }] of Object.entries(byUser)) {
      console.log(`[DailyScoring] Procesando ${leads.length} leads del usuario ${userId}`);
      const { processed, errors } = await scoreLeadsForUser(userId, apiKey, leads);
      totalProcessed += processed;
      totalErrors += errors;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[DailyScoring] Completado en ${elapsed}s — ${totalProcessed} procesados, ${totalErrors} errores`
    );
  } catch (err) {
    console.error('[DailyScoring] Error fatal en job:', err.message);
  }
}

function startDailyScoringJob() {
  cron.schedule('0 8 * * *', runDailyScoring, {
    timezone: 'America/Argentina/Buenos_Aires',
  });
  console.log('[DailyScoring] Job programado para las 8:00 AM (GMT-3)');
}

module.exports = { startDailyScoringJob, runDailyScoring };
