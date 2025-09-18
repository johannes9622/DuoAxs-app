import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../../index.js';

const r = Router();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

r.post('/stripe', async (req, res) => {
  if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  let event;
  try{
    const sig = req.headers['stripe-signature'];
    event = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  }catch (err){
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if(event.type === 'checkout.session.completed'){
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits || 0);
    const amountCents = Number(session.amount_total || 0);
    const providerSessionId = session.id;

    if(userId && credits>0){
      try{
        await prisma.$transaction([
          prisma.creditWallet.upsert({
            where: { userId },
            create: { userId, planCredits: 0, topUpCredits: credits, nextResetAt: null },
            update: { topUpCredits: { increment: credits } }
          }),
          prisma.topUpTransaction.upsert({
            where: { providerSessionId },
            update: {},
            create: { userId, credits, amountCents, providerSessionId }
          })
        ]);
        console.log('Granted credits', credits, 'to', userId);
      }catch(e){
        console.error('Failed to grant credits', e);
      }
    }
  }

  res.json({ received: true });
});

export default r;
