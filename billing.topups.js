import { Router } from 'express';
import Stripe from 'stripe';
import { authRequired } from '../middleware/authRequired.js';

const r = Router();
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

r.post('/topup/session', authRequired, async (req, res) => {
  try{
    if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const userId = req.user?.sub;
    const email = req.user?.email || undefined;
    const pkg = String(req.body?.packageId||'');
    const priceId = process.env[`PRICE_${pkg}`];
    const credits = Number(process.env[`CREDITS_${pkg}`] || 0);
    if(!priceId || !credits) return res.status(400).json({ error: 'Invalid packageId' });

    const success = process.env.TOPUP_SUCCESS_URL || (process.env.PUBLIC_MEMBER_BASE_URL || 'http://localhost:3000') + '/topup?status=success';
    const cancel  = process.env.TOPUP_CANCEL_URL  || (process.env.PUBLIC_MEMBER_BASE_URL || 'http://localhost:3000') + '/topup?status=cancel';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: success,
      cancel_url: cancel,
      metadata: { userId, credits, packageId: pkg }
    });
    res.json({ url: session.url });
  }catch(e){
    console.error(e);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

export default r;
