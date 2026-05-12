CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- PLANES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id                     VARCHAR(50) PRIMARY KEY,
  name                   VARCHAR(100) NOT NULL,
  price_monthly_cents    INTEGER NOT NULL DEFAULT 0,
  stripe_price_id        TEXT,
  max_leads_monthly      INTEGER DEFAULT 50,     -- -1 = ilimitado
  max_campaigns          INTEGER DEFAULT 3,       -- -1 = ilimitado
  max_whatsapp_sessions  INTEGER DEFAULT 1,
  ai_scoring             BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans (id, name, price_monthly_cents, max_leads_monthly, max_campaigns, max_whatsapp_sessions, ai_scoring)
VALUES
  ('free',    'Free',    0,       50,   3,  1,  FALSE),
  ('starter', 'Starter', 2900,    500,  -1, 1,  TRUE),
  ('pro',     'Pro',     7900,    -1,   -1, 3,  TRUE),
  ('agency',  'Agency',  19900,   -1,   -1, 10, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- USUARIOS
-- ─────────────────────────────────────────────
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
);

-- ─────────────────────────────────────────────
-- SUSCRIPCIONES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                  VARCHAR(50) REFERENCES plans(id),
  stripe_subscription_id   TEXT UNIQUE,
  stripe_customer_id       TEXT,
  status                   VARCHAR(50) DEFAULT 'active',
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SESIONES WHATSAPP
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_name VARCHAR(255) NOT NULL UNIQUE,
  status        VARCHAR(30) DEFAULT 'disconnected'
                  CHECK (status IN ('disconnected','connecting','connected')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CAMPAÑAS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  ad_id        VARCHAR(255),
  color        VARCHAR(20) DEFAULT '#F5A623',
  is_active    BOOLEAN DEFAULT TRUE,
  sheet_tab    VARCHAR(255),
  leads_count  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- KEYWORDS POR CAMPAÑA
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_keywords (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword     VARCHAR(255) NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- GOOGLE SHEETS CONFIG
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS google_sheets_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  spreadsheet_id VARCHAR(255),
  access_token   TEXT,
  refresh_token  TEXT,
  is_connected   BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SESIONES META WHATSAPP CLOUD API
-- ─────────────────────────────────────────────
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
);

-- ─────────────────────────────────────────────
-- CONTACTOS WHATSAPP (mapeo LID → teléfono real)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone      TEXT,
  lid        TEXT,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lid)
);

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  phone           VARCHAR(50) NOT NULL,
  name            VARCHAR(255),
  phone_unresolved BOOLEAN DEFAULT FALSE,
  status          VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','converted','lost')),
  ai_score        VARCHAR(20) CHECK (ai_score IN ('FRIO','TIBIO','CALIENTE')),
  ai_reason       TEXT,
  ai_scored_at    TIMESTAMPTZ,
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  converted_at    TIMESTAMPTZ,
  sheet_row_index INTEGER,
  UNIQUE(user_id, phone)
);

-- ─────────────────────────────────────────────
-- MENSAJES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  from_me     BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_user        ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign    ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone       ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_received    ON leads(received_at);
CREATE INDEX IF NOT EXISTS idx_leads_score       ON leads(ai_score);
CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_messages_lead     ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user    ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_kw_campaign       ON campaign_keywords(campaign_id);
CREATE INDEX IF NOT EXISTS idx_kw_user           ON campaign_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user     ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_name     ON whatsapp_sessions(instance_name);
CREATE INDEX IF NOT EXISTS idx_subs_user         ON subscriptions(user_id);
