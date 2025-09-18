import { Router } from 'express';
import { prisma } from '../../index.js';
import { authRequired } from '../middleware/authRequired.js';

const r = Router();
function requireAdmin(req,res,next){ if(req.user?.role!=='ADMIN') return res.status(403).json({error:'Forbidden'}); next(); }

r.get('/earnings/export', authRequired, requireAdmin, async (req, res) => {
  const start = new Date(String(req.query.start || new Date(Date.now()-30*864e5)));
  const end   = new Date(String(req.query.end   || new Date()));
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  const pct = Math.max(0, Math.min(1, Number(process.env.PAYOUT_COMMISSION_PCT || 0.20)));

  const sessions = await prisma.session.findMany({
    where: { status:'completed', startedAt: { gte: start, lte: end } },
    orderBy: { startedAt: 'asc' },
    select: { id:true, startedAt:true, priceCents:true, gymId:true, trainer: { select: { id:true, user: { select:{ email:true, name:true } } } } }
  });

  const lines = [['session_id','date','gym_id','trainer_id','trainer_email','trainer_name','price_usd','net_usd']];
  for(const s of sessions){
    const gross = (Number(s.priceCents||0)/100).toFixed(2);
    const net   = (Number(s.priceCents||0)*(1-pct)/100).toFixed(2);
    lines.push([s.id, s.startedAt.toISOString(), s.gymId, s.trainer?.id||'', s.trainer?.user?.email||'', s.trainer?.user?.name||'', gross, net]);
  }
  const csv = lines.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="duoaxs_all_trainers_${start.toISOString().slice(0,10)}_to_${end.toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

export default r;
