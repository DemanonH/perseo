'use strict';
const bcrypt = require('bcryptjs');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

const DEMO_EMAIL    = 'demo@perseo.app';
const DEMO_PASSWORD = 'demo1234';
const ADMIN_EMAIL   = 'admin@perseo.app';

const CAMPAIGNS = [
  { name: 'Mesas de Madera',    ad_id: 'fb_mesas_001',    color: '#F5A623', keywords: ['mesa', 'madera', 'precio mesa', 'cuánto sale'] },
  { name: 'Sillas Ergonómicas', ad_id: 'ig_sillas_002',   color: '#6366F1', keywords: ['silla', 'ergonómica', 'oficina', 'silla precio'] },
  { name: 'Cortinas Premium',   ad_id: 'fb_cortinas_003', color: '#10B981', keywords: ['cortina', 'tela', 'ventana', 'medida'] },
];

const LEAD_NAMES = [
  'Martina González', 'Diego Fernández', 'Camila Vega', 'Sebastián Ruiz',
  'Valentina López', 'Nicolás Castro', 'Sofía Martínez', 'Lucas Romero',
  'Agustina Torres', 'Facundo Díaz', 'Lucía Morales', 'Matías Jiménez',
  'Florencia García', 'Tomás Sánchez', 'Julieta Pérez', 'Ignacio Álvarez',
  'Milagros Herrera', 'Bruno Medina', 'Rocío Suárez', 'Axel Molina',
  'Daniela Reyes', 'Cristian Blanco', 'Emilia Navarro', 'Nahuel Vargas',
  'Aldana Ortiz',
];

const SCORES = ['CALIENTE', 'CALIENTE', 'TIBIO', 'TIBIO', 'TIBIO', 'FRIO', 'FRIO', null];

const CONVERSATIONS = {
  CALIENTE: [
    [
      { from_me: false, body: 'Hola! Vi el anuncio y quería saber el precio de las mesas' },
      { from_me: true,  body: '¡Hola! Claro, tenemos mesas de roble desde $45.000. ¿Qué medidas buscás?' },
      { from_me: false, body: 'Necesito una de 1.80 x 0.90 para el comedor' },
      { from_me: true,  body: 'Esa medida la tenemos disponible en stock. El precio es $62.000 con envío incluido' },
      { from_me: false, body: 'Perfecto! Cómo hago para comprarla? Puedo pagar con tarjeta?' },
      { from_me: true,  body: 'Sí, aceptamos todas las tarjetas. Te paso el link de pago o si querés pasás por el local' },
      { from_me: false, body: 'Mandame el link porfa, la quiero esta semana' },
    ],
    [
      { from_me: false, body: 'Buenas, necesito una silla para home office urgente' },
      { from_me: true,  body: 'Hola! Tenemos sillas ergonómicas con soporte lumbar. ¿Cuál es tu presupuesto?' },
      { from_me: false, body: 'Hasta $80.000 más o menos' },
      { from_me: true,  body: 'Con ese presupuesto tenés la modelo ErgoMax que es nuestra más vendida. Armado incluido.' },
      { from_me: false, body: 'Qué bien! La quiero. Hacen envíos a Palermo?' },
      { from_me: true,  body: 'Sí, envíos a todo CABA en 48hs. ¿Empezamos con el pedido?' },
      { from_me: false, body: 'Dale sí, anotame!' },
    ],
  ],
  TIBIO: [
    [
      { from_me: false, body: 'Hola vi las cortinas en Instagram, muy lindas' },
      { from_me: true,  body: 'Gracias! Contamos con cortinas de lino, terciopelo y blackout. ¿Para qué ambiente?' },
      { from_me: false, body: 'Para el dormitorio, algo que no deje pasar la luz' },
      { from_me: true,  body: 'Las blackout son perfectas para eso. Traemos a medida con instalación incluida.' },
      { from_me: false, body: 'Ah qué bueno. Déjame consultarlo con mi pareja y te aviso' },
      { from_me: true,  body: 'Cuando quieras! Acá estamos para lo que necesites' },
    ],
    [
      { from_me: false, body: 'Cuánto sale una mesa ratona?' },
      { from_me: true,  body: 'Las ratonas de madera arrancan desde $28.000. Tenemos en pino y roble.' },
      { from_me: false, body: 'Ok, voy a ver. Tengo que medir el espacio primero' },
      { from_me: true,  body: 'Claro, tomá tu tiempo. Si querés te mando el catálogo completo por este medio.' },
      { from_me: false, body: 'Sí mandame' },
    ],
  ],
  FRIO: [
    [
      { from_me: false, body: 'Hola, me interesa info de las mesas' },
      { from_me: true,  body: '¡Hola! Con gusto. Contamos con mesas de comedor, ratona y escritorio. ¿Qué tipo buscás?' },
      { from_me: false, body: 'Ah gracias, era para ver nomás. Saludos' },
    ],
    [
      { from_me: false, body: 'precio sillas' },
      { from_me: true,  body: 'Hola! Las sillas arrancan desde $15.000. ¿Qué tipo de silla necesitás?' },
    ],
  ],
};

function randomDaysAgo(min, max) {
  const days = min + Math.floor(Math.random() * (max - min));
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
  return d;
}

function randomPhone() {
  const area = ['11', '351', '341', '261', '223', '299'][Math.floor(Math.random() * 6)];
  const num = Math.floor(Math.random() * 90000000) + 10000000;
  return `+54${area}${num}`;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedAdmin() {
  const existing = await query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
  if (existing.rows.length) return;

  const hash = await bcrypt.hash('admin1234', 12);
  const userResult = await query(
    `INSERT INTO users (email, password_hash, name, plan_id, is_admin, onboarding_completed)
     VALUES ($1, $2, 'Admin Perseo', 'agency', true, true) RETURNING id`,
    [ADMIN_EMAIL, hash]
  );
  const userId = userResult.rows[0].id;

  const wsResult = await query(
    `INSERT INTO workspaces (name, owner_id) VALUES ('Admin Workspace', $1) RETURNING id`,
    [userId]
  );
  await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [wsResult.rows[0].id, userId]
  );

  logger.ok(`Admin creado: ${ADMIN_EMAIL} / admin1234`);
}

async function seed() {
  // Always ensure admin user exists, regardless of SEED_DEMO flag
  await seedAdmin();

  if (process.env.SEED_DEMO !== 'true') return;

  logger.seed('Verificando si el modo demo está habilitado...');

  const existing = await query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
  if (existing.rows.length) {
    logger.seed('Datos demo ya existen. Saltando seeder.');
    return;
  }

  logger.seed('Iniciando carga de datos demo...');

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userResult = await query(
    `INSERT INTO users (email, password_hash, name, plan_id, onboarding_completed)
     VALUES ($1, $2, $3, 'pro', true) RETURNING id`,
    [DEMO_EMAIL, hash, 'Usuario Demo']
  );
  const userId = userResult.rows[0].id;
  logger.seed('Usuario demo creado', { email: DEMO_EMAIL });

  // Create workspace for demo user
  const wsResult = await query(
    `INSERT INTO workspaces (name, owner_id) VALUES ('Demo Workspace', $1) RETURNING id`,
    [userId]
  );
  const workspaceId = wsResult.rows[0].id;
  await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [workspaceId, userId]
  );

  await query(
    'INSERT INTO google_sheets_config (user_id, workspace_id, is_connected) VALUES ($1, $2, false)',
    [userId, workspaceId]
  );

  const campaignIds = [];
  for (const c of CAMPAIGNS) {
    const res = await query(
      `INSERT INTO campaigns (user_id, workspace_id, name, ad_id, color, sheet_tab, is_active)
       VALUES ($1, $2, $3, $4, $5, $3, true) RETURNING id`,
      [userId, workspaceId, c.name, c.ad_id, c.color]
    );
    const campId = res.rows[0].id;
    campaignIds.push(campId);

    for (const kw of c.keywords) {
      await query(
        'INSERT INTO campaign_keywords (campaign_id, user_id, workspace_id, keyword) VALUES ($1, $2, $3, $4)',
        [campId, userId, workspaceId, kw]
      );
    }
  }
  logger.seed(`${CAMPAIGNS.length} campañas demo creadas`);

  let leadsCreated = 0;
  for (let i = 0; i < LEAD_NAMES.length; i++) {
    const name = LEAD_NAMES[i];
    const phone = randomPhone();
    const campaignId = campaignIds[i % campaignIds.length];
    const score = SCORES[i % SCORES.length];
    const receivedAt = randomDaysAgo(0, 30);
    const isConverted = score === 'CALIENTE' && Math.random() > 0.5;

    const leadRes = await query(
      `INSERT INTO leads
         (user_id, workspace_id, campaign_id, phone, name, status, ai_score, ai_reason, ai_scored_at, received_at, converted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        userId, workspaceId, campaignId, phone, name,
        isConverted ? 'converted' : 'new',
        score,
        score === 'CALIENTE' ? 'El lead preguntó precio, pidió el link de pago y quiere comprar esta semana.' :
        score === 'TIBIO'    ? 'Mostró interés pero necesita consultarlo. Potencial de cierre en los próximos días.' :
        score === 'FRIO'     ? 'Agradeció la información pero no mostró intención de compra.' :
        null,
        score ? new Date(receivedAt.getTime() + 86400000) : null,
        receivedAt,
        isConverted ? new Date(receivedAt.getTime() + 7200000) : null,
      ]
    );
    const leadId = leadRes.rows[0].id;

    const convType = score === 'CALIENTE' ? 'CALIENTE' : score === 'TIBIO' ? 'TIBIO' : 'FRIO';
    const msgs = pickRandom(CONVERSATIONS[convType] || CONVERSATIONS.FRIO);

    let msgTime = receivedAt;
    for (const msg of msgs) {
      msgTime = new Date(msgTime.getTime() + 60000 * (1 + Math.floor(Math.random() * 30)));
      await query(
        'INSERT INTO messages (lead_id, user_id, body, from_me, received_at) VALUES ($1,$2,$3,$4,$5)',
        [leadId, userId, msg.body, msg.from_me, msgTime]
      );
    }

    leadsCreated++;
  }

  for (const campId of campaignIds) {
    await query(
      'UPDATE campaigns SET leads_count = (SELECT COUNT(*) FROM leads WHERE campaign_id = $1) WHERE id = $1',
      [campId]
    );
  }

  logger.seed(`${leadsCreated} leads demo creados con mensajes y scoring`);
  logger.ok('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.ok(`Datos demo cargados exitosamente.`);
  logger.ok(`Demo:  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  logger.ok(`Admin: ${ADMIN_EMAIL} / admin1234`);
  logger.ok('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

module.exports = { seed };
