const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM keywords WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Keywords GET error:', err);
    res.status(500).json({ message: 'Error al obtener keywords' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { keyword, campaign_name } = req.body;
    if (!keyword || !campaign_name) {
      return res.status(400).json({ message: 'keyword y campaign_name son requeridos' });
    }
    const result = await query(
      'INSERT INTO keywords (user_id, keyword, campaign_name) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, keyword.toLowerCase().trim(), campaign_name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Keywords POST error:', err);
    res.status(500).json({ message: 'Error al crear keyword' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { keyword, campaign_name, is_active } = req.body;
    const result = await query(
      `UPDATE keywords
       SET keyword = COALESCE($1, keyword),
           campaign_name = COALESCE($2, campaign_name),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        keyword ? keyword.toLowerCase().trim() : null,
        campaign_name ? campaign_name.trim() : null,
        is_active !== undefined ? is_active : null,
        req.params.id,
        req.userId
      ]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Keyword no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Keywords PUT error:', err);
    res.status(500).json({ message: 'Error al actualizar keyword' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM keywords WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Keyword no encontrada' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Keywords DELETE error:', err);
    res.status(500).json({ message: 'Error al eliminar keyword' });
  }
});

module.exports = router;
