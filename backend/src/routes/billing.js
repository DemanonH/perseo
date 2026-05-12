const router = require('express').Router();
const express = require('express');
const auth = require('../middleware/auth');
const { query } = require('../lib/db');
const stripeService = require('../services/stripe');

router.get('/plans', async (req, res) => {
  try {
    const result = await query('SELECT * FROM plans ORDER BY price_monthly_cents ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener planes' });
  }
});

router.get('/subscription', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, p.name AS plan_name, p.price_monthly_cents,
              p.max_leads_monthly, p.max_campaigns, p.max_whatsapp_sessions, p.ai_scoring
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN plans p ON p.id = COALESCE(s.plan_id, u.plan_id)
       WHERE u.id = $1`,
      [req.userId]
    );
    const user = await query('SELECT plan_id FROM users WHERE id = $1', [req.userId]);
    res.json({
      subscription: result.rows[0] || null,
      current_plan: user.rows[0]?.plan_id || 'free',
    });
  } catch (err) {
    console.error('Subscription GET error:', err);
    res.status(500).json({ message: 'Error al obtener suscripción' });
  }
});

router.post('/checkout', auth, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const userResult = await query('SELECT email FROM users WHERE id = $1', [req.userId]);
    if (!userResult.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const session = await stripeService.createCheckoutSession(
      req.userId,
      userResult.rows[0].email,
      plan_id,
      appUrl
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ message: err.message || 'Error al crear sesión de pago' });
  }
});

router.post('/portal', auth, async (req, res) => {
  try {
    const userResult = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.userId]);
    const customerId = userResult.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ message: 'No hay suscripción activa para gestionar' });

    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const session = await stripeService.createPortalSession(customerId, appUrl);
    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ message: 'Error al abrir portal de facturación' });
  }
});

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = await stripeService.handleWebhook(req.body, sig);
    } catch (err) {
      console.error('Stripe webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const customerId = session.customer;

        if (userId && planId) {
          await query('UPDATE users SET plan_id = $1, stripe_customer_id = $2 WHERE id = $3', [planId, customerId, userId]);
          await query(
            `INSERT INTO subscriptions (user_id, plan_id, stripe_subscription_id, stripe_customer_id, status)
             VALUES ($1, $2, $3, $4, 'active')
             ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = 'active', plan_id = $2`,
            [userId, planId, session.subscription, customerId]
          );
        }
      }

      if (event.type === 'customer.subscription.updated') {
        const sub = event.data.object;
        const planId = stripeService.getPlanIdFromPriceId(sub.items?.data[0]?.price?.id);
        const status = sub.status === 'active' ? 'active' : 'canceled';
        const periodEnd = new Date(sub.current_period_end * 1000);

        await query(
          `UPDATE subscriptions SET status = $1, plan_id = $2, current_period_end = $3, cancel_at_period_end = $4
           WHERE stripe_subscription_id = $5`,
          [status, planId, periodEnd, sub.cancel_at_period_end, sub.id]
        );

        const subResult = await query('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1', [sub.id]);
        if (subResult.rows.length) {
          await query('UPDATE users SET plan_id = $1 WHERE id = $2', [planId, subResult.rows[0].user_id]);
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        await query(
          'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
          ['canceled', sub.id]
        );
        const subResult = await query('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1', [sub.id]);
        if (subResult.rows.length) {
          await query('UPDATE users SET plan_id = $1 WHERE id = $2', ['free', subResult.rows[0].user_id]);
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Stripe webhook handler error:', err);
      res.status(500).json({ message: 'Webhook handler error' });
    }
  }
);

module.exports = router;
