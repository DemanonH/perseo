require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./lib/db');
const logger = require('./lib/logger');

const authRoutes        = require('./routes/auth');
const whatsappRoutes    = require('./routes/whatsapp');
const campaignRoutes    = require('./routes/campaigns');
const sheetsRoutes      = require('./routes/sheets');
const leadsRoutes       = require('./routes/leads');
const settingsRoutes    = require('./routes/settings');
const webhookRoutes     = require('./routes/webhook');
const webhookMetaRoutes      = require('./routes/webhookMeta');
const dialog360Routes        = require('./routes/dialog360');
const webhookDialog360Routes = require('./routes/webhookDialog360');
const billingRoutes          = require('./routes/billing');
const onboardingRoutes  = require('./routes/onboarding');
const healthRoutes      = require('./routes/health');
const twilioRoutes        = require('./routes/twilio');
const webhookTwilioRoutes = require('./routes/webhookTwilio');
const { startDailyScoringJob } = require('./workers/dailyScoringJob');
const { seed } = require('./seeders/demo');
const { restoreWebhooks } = require('./workers/webhookSync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
// Raw body needed BEFORE express.json() for signature verification
app.use('/api/billing/webhook',    express.raw({ type: 'application/json' }));
app.use('/api/webhook/meta',       express.raw({ type: 'application/json' }));
app.use('/api/webhook/dialog360',  express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Twilio webhook uses form-encoded — urlencoded already handles it above

app.use('/api/health',     healthRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/whatsapp',   whatsappRoutes);
app.use('/api/campaigns',  campaignRoutes);
app.use('/api/sheets',     sheetsRoutes);
app.use('/api/leads',      leadsRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/webhook',      webhookRoutes);
app.use('/api/webhook/meta',      webhookMetaRoutes);
app.use('/api/webhook/dialog360', webhookDialog360Routes);
app.use('/api/whatsapp/dialog360', dialog360Routes);
app.use('/api/whatsapp/twilio',   twilioRoutes);
app.use('/api/webhook/twilio',    webhookTwilioRoutes);
app.use('/api/billing',           billingRoutes);
app.use('/api/onboarding', onboardingRoutes);

app.use((err, req, res, _next) => {
  logger.error(`${req.method} ${req.path}`, err.message);
  res.status(500).json({ message: 'Error interno del servidor' });
});

async function runMigrations() {
  const { query } = require('./lib/db');
  // Tablas nuevas — idempotentes con IF NOT EXISTS
  await query(`
    CREATE TABLE IF NOT EXISTS meta_sessions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone_number_id  TEXT NOT NULL UNIQUE,
      waba_id          TEXT NOT NULL,
      access_token     TEXT NOT NULL,
      phone_number     TEXT,
      display_name     TEXT,
      is_active        BOOLEAN DEFAULT TRUE,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_contacts (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone      TEXT,
      lid        TEXT,
      name       TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, lid)
    )
  `);
  // Columna nueva en leads (idempotente)
  await query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_unresolved BOOLEAN DEFAULT FALSE
  `);
  // Tabla 360dialog sessions
  await query(`
    CREATE TABLE IF NOT EXISTS dialog360_sessions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_id   TEXT NOT NULL UNIQUE,
      api_key      TEXT NOT NULL,
      phone_number TEXT,
      display_name TEXT,
      is_active    BOOLEAN DEFAULT TRUE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Tabla Twilio sessions
  await query(`
    CREATE TABLE IF NOT EXISTS twilio_sessions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_sid  TEXT NOT NULL UNIQUE,
      auth_token   TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      display_name TEXT,
      is_active    BOOLEAN DEFAULT TRUE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  logger.ok('Migraciones aplicadas');
}

async function start() {
  logger.info('Iniciando Perseo v2...');

  await initDb();
  logger.ok('PostgreSQL conectado');

  await runMigrations();

  await seed();

  startDailyScoringJob();
  restoreWebhooks().catch(err => logger.warn(`webhookSync: ${err.message}`));

  app.listen(PORT, '0.0.0.0', () => {
    logger.ok(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.ok(`Perseo backend escuchando en :${PORT}`);
    logger.ok(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.ok(`Health: http://localhost:${PORT}/api/health/full`);
      logger.ok(`Demo:   demo@perseo.app / demo1234`);
    }
    logger.ok(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  });
}

start().catch(err => {
  logger.error('Error fatal al iniciar el servidor:', err.message);
  process.exit(1);
});
