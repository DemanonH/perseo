const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const PRICE_MAP = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro:     process.env.STRIPE_PRICE_PRO,
  agency:  process.env.STRIPE_PRICE_AGENCY,
};

const PLAN_MAP = {
  [process.env.STRIPE_PRICE_STARTER]: 'starter',
  [process.env.STRIPE_PRICE_PRO]:     'pro',
  [process.env.STRIPE_PRICE_AGENCY]:  'agency',
};

async function createCheckoutSession(userId, email, planId, appUrl) {
  const priceId = PRICE_MAP[planId];
  if (!priceId) throw new Error(`Plan inválido: ${planId}`);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${appUrl}/billing?canceled=true`,
    metadata: { userId, planId },
    subscription_data: { metadata: { userId, planId } },
  });

  return session;
}

async function createPortalSession(stripeCustomerId, appUrl) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });
  return session;
}

async function handleWebhook(rawBody, signature) {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  return event;
}

function getPlanIdFromPriceId(priceId) {
  return PLAN_MAP[priceId] || 'free';
}

module.exports = { stripe, createCheckoutSession, createPortalSession, handleWebhook, getPlanIdFromPriceId };
