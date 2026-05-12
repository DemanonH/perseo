const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../lib/db');

router.get('/status', auth, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT onboarding_step, onboarding_completed FROM users WHERE id = $1',
      [req.userId]
    );
    if (!userResult.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    const { onboarding_step, onboarding_completed } = userResult.rows[0];

    const [wpResult, campaignResult, sheetsResult] = await Promise.all([
      query('SELECT status FROM whatsapp_sessions WHERE user_id = $1', [req.userId]),
      query('SELECT COUNT(*) FROM campaigns WHERE user_id = $1', [req.userId]),
      query('SELECT is_connected FROM google_sheets_config WHERE user_id = $1', [req.userId]),
    ]);

    const steps = {
      account:   true,
      whatsapp:  wpResult.rows[0]?.status === 'connected',
      campaigns: parseInt(campaignResult.rows[0].count) > 0,
      sheets:    sheetsResult.rows[0]?.is_connected === true,
    };

    const completedCount = Object.values(steps).filter(Boolean).length;
    const allDone = Object.values(steps).every(Boolean);

    if (allDone && !onboarding_completed) {
      await query(
        'UPDATE users SET onboarding_completed = true, onboarding_step = 4 WHERE id = $1',
        [req.userId]
      );
    }

    res.json({ steps, onboarding_completed: allDone || onboarding_completed, onboarding_step, completedCount });
  } catch (err) {
    console.error('Onboarding status error:', err);
    res.status(500).json({ message: 'Error al obtener estado del onboarding' });
  }
});

router.put('/step', auth, async (req, res) => {
  try {
    const { step } = req.body;
    await query(
      'UPDATE users SET onboarding_step = $1 WHERE id = $2',
      [step, req.userId]
    );
    res.json({ success: true, step });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar onboarding' });
  }
});

router.post('/complete', auth, async (req, res) => {
  try {
    await query(
      'UPDATE users SET onboarding_completed = true, onboarding_step = 4 WHERE id = $1',
      [req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error al completar onboarding' });
  }
});

module.exports = router;
