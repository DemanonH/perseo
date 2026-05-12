const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, plan_id, openai_api_key, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const user = result.rows[0];
    if (user.openai_api_key) {
      user.openai_api_key = user.openai_api_key.slice(0, 8) + '••••••••••••••••';
    }
    res.json(user);
  } catch (err) {
    console.error('Settings GET error:', err);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { name, openai_api_key } = req.body;
    const result = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           openai_api_key = COALESCE($2, openai_api_key)
       WHERE id = $3
       RETURNING id, email, name, plan, created_at`,
      [name || null, openai_api_key || null, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Settings PUT error:', err);
    res.status(500).json({ message: 'Error al guardar configuración' });
  }
});

module.exports = router;
