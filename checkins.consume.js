// apps/api/backend/src/routes/checkins.consume.js
import { Router } from 'express';
import { prisma } from '../../index.js';
import { authRequired } from '../middleware/authRequired.js';

const r = Router();

/**
 * POST /checkins
 * Body: { gymId: string }
 * Uses credits in order: topUpCredits first, then planCredits.
 * Creates a Checkin record if successful.
 */
r.post('/checkins', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const gymId = String(req.body?.gymId || '');
  if(!gymId) return res.status(400).json({ error: 'gymId required' });

  const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
  if(!wallet) return res.status(400).json({ error: 'Wallet not found' });

  if((wallet.topUpCredits + wallet.planCredits) <= 0){
    return res.status(402).json({ error: 'Insufficient credits' });
  }

  const useTopUp = wallet.topUpCredits > 0 ? 1 : 0;
  const usePlan = useTopUp ? 0 : 1;

  const updated = await prisma.$transaction(async (tx) => {
    const w = await tx.creditWallet.update({
      where: { userId },
      data: {
        topUpCredits: useTopUp ? { decrement: 1 } : undefined,
        planCredits: usePlan ? { decrement: 1 } : undefined
      }
    });

    const c = await tx.checkin.create({
      data: { userId, gymId }
    });
    return { w, c };
  });

  res.json({
    ok: true,
    consumed: useTopUp ? 'topUp' : 'plan',
    wallet: { planCredits: updated.w.planCredits, topUpCredits: updated.w.topUpCredits, total: updated.w.planCredits + updated.w.topUpCredits },
    checkin: updated.c
  });
});

export default r;
