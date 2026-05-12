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

  // pgcrypto — optional, gen_random_uuid() is built-in in PG13+
  try { await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`); } catch (_) {}

  // ── Base schema (idempotente) ────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS plans (
      id                     VARCHAR(50) PRIMARY KEY,
      name                   VARCHAR(100) NOT NULL,
      price_monthly_cents    INTEGER NOT NULL DEFAULT 0,
      stripe_price_id        TEXT,
      max_leads_monthly      INTEGER DEFAULT 50,
      max_campaigns          INTEGER DEFAULT 3,
      max_whatsapp_sessions  INTEGER DEFAULT 1,
      ai_scoring             BOOLEAN DEFAULT FALSE,
      created_at             TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    INSERT INTO plans (id, name, price_monthly_cents, max_leads_monthly, max_campaigns, max_whatsapp_sessions, ai_scoring)
    VALUES
      ('free',    'Free',    0,     50,  3,  1,  FALSE),
      ('starter', 'Starter', 2900,  500, -1, 1,  TRUE),
      ('pro',     'Pro',     7900,  -1,  -1, 3,  TRUE),
      ('agency',  'Agency',  19900, -1,  -1, 10, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email                VARCHAR(255) UNIQUE NOT NULL,
      password_hash        VARCHAR(255) NOT NULL,
      name                 VARCHAR(255) NOT NULL,
      plan_id              VARCHAR(50) DEFAULT 'free' REFERENCES plans(id),
      openai_api_key       TEXT,
      stripe_customer_id   TEXT,
      onboarding_step      INTEGER DEFAULT 0,
      onboarding_completed BOOLEAN DEFAULT FALSE,
      created_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id                VARCHAR(50) REFERENCES plans(id),
      stripe_subscription_id TEXT UNIQUE,
      stripe_customer_id     TEXT,
      status                 VARCHAR(50) DEFAULT 'active',
      current_period_end     TIMESTAMPTZ,
      cancel_at_period_end   BOOLEAN DEFAULT FALSE,
      created_at             TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      instance_name VARCHAR(255) NOT NULL UNIQUE,
      status        VARCHAR(30) DEFAULT 'disconnected'
                      CHECK (status IN ('disconnected','connecting','connected')),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        VARCHAR(255) NOT NULL,
      ad_id       VARCHAR(255),
      color       VARCHAR(20) DEFAULT '#F5A623',
      is_active   BOOLEAN DEFAULT TRUE,
      sheet_tab   VARCHAR(255),
      leads_count INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS campaign_keywords (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      keyword     VARCHAR(255) NOT NULL,
      is_active   BOOLEAN DEFAULT TRUE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS google_sheets_config (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      spreadsheet_id VARCHAR(255),
      access_token   TEXT,
      refresh_token  TEXT,
      is_connected   BOOLEAN DEFAULT FALSE,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS leads (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id      UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      phone            VARCHAR(50) NOT NULL,
      name             VARCHAR(255),
      phone_unresolved BOOLEAN DEFAULT FALSE,
      status           VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','converted','lost')),
      ai_score         VARCHAR(20) CHECK (ai_score IN ('FRIO','TIBIO','CALIENTE')),
      ai_reason        TEXT,
      ai_scored_at     TIMESTAMPTZ,
      received_at      TIMESTAMPTZ DEFAULT NOW(),
      converted_at     TIMESTAMPTZ,
      sheet_row_index  INTEGER,
      UNIQUE(user_id, phone)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      from_me     BOOLEAN DEFAULT FALSE,
      received_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Indexes ──────────────────────────────────────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_leads_user     ON leads(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_leads_phone    ON leads(phone)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_leads_received ON leads(received_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_leads_score    ON leads(ai_score)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_lead  ON messages(lead_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_kw_campaign    ON campaign_keywords(campaign_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_kw_user        ON campaign_keywords(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user  ON whatsapp_sessions(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_name  ON whatsapp_sessions(instance_name)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_subs_user      ON subscriptions(user_id)`);

  // ── Extended tables ──────────────────────────────────────────────────────
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
  await query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_unresolved BOOLEAN DEFAULT FALSE
  `);
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
