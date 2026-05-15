'use strict';
const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');
const metaWhatsapp = require('../services/metaWhatsapp');

// GET /api/templates
router.get('/', auth, async (req, res) => {
  try {
    const session = await metaWhatsapp.getActiveSession(req.workspaceId);

    if (session) {
      const metaRes = await metaWhatsapp.getTemplates(session.waba_id, session.access_token);
      if (metaRes.data) {
        for (const t of metaRes.data) {
          const bodyComp   = t.components?.find(c => c.type === 'BODY');
          const headerComp = t.components?.find(c => c.type === 'HEADER' && c.format === 'TEXT');
          const footerComp = t.components?.find(c => c.type === 'FOOTER');
          await query(`
            INSERT INTO wa_templates
              (workspace_id, template_id, name, category, language, status, body_text, header_text, footer_text, meta_data)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (workspace_id, template_id) WHERE template_id IS NOT NULL
            DO UPDATE SET status=EXCLUDED.status, meta_data=EXCLUDED.meta_data, updated_at=NOW()
          `, [
            req.workspaceId, t.id, t.name, t.category, t.language, t.status,
            bodyComp?.text || null, headerComp?.text || null, footerComp?.text || null,
            JSON.stringify(t),
          ]);
        }
        return res.json({
          templates: metaRes.data.map(t => ({
            id: t.id, name: t.name, category: t.category, language: t.language, status: t.status,
            body_text: t.components?.find(c => c.type === 'BODY')?.text || '',
            header_text: t.components?.find(c => c.type === 'HEADER' && c.format === 'TEXT')?.text || null,
            footer_text: t.components?.find(c => c.type === 'FOOTER')?.text || null,
            components: t.components,
          })),
          source: 'meta'
        });
      }
    }

    const local = await query(
      'SELECT * FROM wa_templates WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.workspaceId]
    );
    res.json({ templates: local.rows, source: 'local' });
  } catch (err) {
    console.error('Templates GET error:', err);
    res.status(500).json({ message: 'Error al obtener templates' });
  }
});

// POST /api/templates
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, language, body, header, footer } = req.body;
    if (!name || !category || !language || !body) {
      return res.status(400).json({ message: 'name, category, language y body son requeridos' });
    }

    const session = await metaWhatsapp.getActiveSession(req.workspaceId);
    if (!session) {
      return res.status(400).json({ message: 'Necesitás conectar Meta Cloud API primero para crear templates.' });
    }

    const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 512);
    const components = [];
    if (header) components.push({ type: 'HEADER', format: 'TEXT', text: header });
    components.push({ type: 'BODY', text: body });
    if (footer) components.push({ type: 'FOOTER', text: footer });

    const templatePayload = { name: safeName, category, language, components };
    const metaRes = await metaWhatsapp.createTemplate(session.waba_id, session.access_token, templatePayload);

    if (metaRes.error) {
      return res.status(400).json({ message: metaRes.error.message || 'Error al crear template en Meta' });
    }

    const saved = await query(`
      INSERT INTO wa_templates
        (workspace_id, template_id, name, category, language, status, body_text, header_text, footer_text, meta_data)
      VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,$8,$9) RETURNING *
    `, [req.workspaceId, metaRes.id || null, safeName, category, language, body, header || null, footer || null, JSON.stringify(metaRes)]);

    res.status(201).json({ template: saved.rows[0] });
  } catch (err) {
    console.error('Templates POST error:', err);
    res.status(500).json({ message: 'Error al crear template' });
  }
});

module.exports = router;
