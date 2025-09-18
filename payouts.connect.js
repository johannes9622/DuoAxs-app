// apps/api/backend/src/routes/payouts.connect.js
import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../../index.js';
import { authRequired } from '../middleware/authRequired.js';

const r = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * POST /payouts/connect/account
 * Creates or returns a Stripe Connect account for the authenticated trainer.
 */
r.post('/payouts/connect/account', authRequired, async (req, res) => {
  if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });

  if(!trainer.stripeAccountId){
    const acct = await stripe.accounts.create({ type: 'express' });
    await prisma.trainer.update({ where: { id: trainer.id }, data: { stripeAccountId: acct.id } });
  }

  const t2 = await prisma.trainer.findUnique({ where: { userId } });
  const link = await stripe.accountLinks.create({
    account: t2.stripeAccountId,
    refresh_url: (process.env.PUBLIC_MEMBER_BASE_URL || 'http://localhost:3000') + '/trainer/onboarding?status=refresh',
    return_url: (process.env.PUBLIC_MEMBER_BASE_URL || 'http://localhost:3000') + '/trainer/onboarding?status=return',
    type: 'account_onboarding'
  });

  res.json({ accountId: t2.stripeAccountId, onboardingUrl: link.url });
});

/**
 * POST /payouts/instant
 * Body: { amountCents }
 * Creates an instant payout (if enabled on the connected account) to the trainer.
 */
r.post('/payouts/instant', authRequired, async (req, res) => {
  if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if(!trainer?.stripeAccountId) return res.status(400).json({ error: 'Trainer not connected to Stripe' });

  const amount = Math.max(100, Number(req.body?.amountCents || 0)); // min $1
  try{
    const payout = await stripe.payouts.create({ amount, currency: 'usd', method: 'instant' }, { stripeAccount: trainer.stripeAccountId });
    res.json({ ok: true, payout });
  }catch(e){
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /payouts/batch-weekly
 * Runs weekly batch payouts for all trainers based on completed sessions
 * for the prior week (Mon 00:00 to Mon 00:00).
 */
r.post('/payouts/batch-weekly', authRequired, async (req, res) => {
  // For safety, limit to admins
  if(req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  // compute last week window
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1) - day;
  const thisMon = new Date(now); thisMon.setDate(now.getDate() + diffToMon); thisMon.setHours(0,0,0,0);
  const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);

  // group sessions by trainer
  const sessions = await prisma.session.findMany({
    where: { status:'completed', startedAt: { gte: lastMon, lt: thisMon } },
    select: { priceCents:true, trainerId:true, trainer:{ select:{ id:true, stripeAccountId:true } } }
  });

  const pct = Math.max(0, Math.min(1, Number(process.env.PAYOUT_COMMISSION_PCT || 0.20)));
  const byTrainer = new Map();
  for(const s of sessions){
    const net = Math.round(Number(s.priceCents||0) * (1 - pct));
    if(!byTrainer.has(s.trainerId)) byTrainer.set(s.trainerId, { amount:0, acct:s.trainer?.stripeAccountId });
    byTrainer.get(s.trainerId).amount += net;
  }

  const results = [];
  for(const [trainerId, { amount, acct }] of byTrainer.entries()){
    if(!acct || amount <= 0) { results.push({ trainerId, skipped:true }); continue; }
    try{
      const transfer = await stripe.transfers.create({ amount, currency: 'usd', destination: acct, description: 'DuoAxs weekly payout' });
      results.push({ trainerId, amount, transferId: transfer.id });
    }catch(e){
      results.push({ trainerId, error: String(e.message) });
    }
  }

  res.json({ ok: true, window: { start: lastMon, end: thisMon }, results });
});

export default r;
