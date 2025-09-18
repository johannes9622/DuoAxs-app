import { Router } from 'express';
import { prisma } from '../../index.js';
import { authRequired } from '../middleware/authRequired.js';

const r = Router();
function requireAdmin(req,res,next){ if(req.user?.role!=='ADMIN') return res.status(403).json({error:'Forbidden'}); next(); }

r.get('/topups', authRequired, requireAdmin, async (req, res) => {
  const start = new Date(String(req.query.start || new Date(Date.now()-30*864e5)));
  const end = new Date(String(req.query.end || new Date()));
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  const rows = await prisma.topUpTransaction.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: 'desc' },
    take: 1000,
    select: { id:true, userId:true, credits:true, amountCents:true, createdAt:true, providerSessionId:true, user:{ select:{ email:true } } }
  }).catch(()=>[]);
  res.json({ items: rows.map(r => ({ id:r.id, date:r.createdAt, userId:r.userId, email:r.user?.email||'', credits:r.credits, amountUsd:(r.amountCents/100).toFixed(2), session:r.providerSessionId||'' })) });
});

r.get('/topups/export', authRequired, requireAdmin, async (req, res) => {
  const start = new Date(String(req.query.start || new Date(Date.now()-30*864e5)));
  const end = new Date(String(req.query.end || new Date()));
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  const rows = await prisma.topUpTransaction.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
    select: { id:true, userId:true, credits:true, amountCents:true, createdAt:true, providerSessionId:true, user:{ select:{ email:true } } }
  }).catch(()=>[]);
  const lines = [['id','date','user_id','email','credits','amount_usd','provider_session_id']];
  for(const r of rows){
    lines.push([r.id, r.createdAt.toISOString(), r.userId, r.user?.email||'', r.credits, (r.amountCents/100).toFixed(2), r.providerSessionId||'']);
  }
  const csv = lines.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="duoaxs_topups_${start.toISOString().slice(0,10)}_to_${end.toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

export default r;
