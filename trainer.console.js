import { Router } from 'express';
import { prisma } from '../../index.js';
import { authRequired } from '../middleware/authRequired.js';
import PDFDocument from 'pdfkit';

const r = Router();

function mondayStart(d=new Date()){
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}
function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtISODate(d){ const x=new Date(d); x.setHours(0,0,0,0); return x.toISOString().slice(0,10); }

r.get('/me', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { trainer: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

r.get('/sessions', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (!trainer) return res.status(404).json({ error: 'Trainer profile not found' });
  const days = Number(req.query.sinceDays || 60);
  const since = new Date(Date.now() - days * 864e5);
  const sessions = await prisma.session.findMany({
    where: { trainerId: trainer.id, startedAt: { gte: since } },
    orderBy: { startedAt: 'desc' },
    take: 200
  });
  res.json({ since: since.toISOString(), sessions });
});

r.post('/payout-mode', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const payoutMode = String(req.body?.payoutMode||'WEEKLY').toUpperCase();
  const allowed = ['INSTANT','WEEKLY','MONTHLY'];
  if(!allowed.includes(payoutMode)) return res.status(400).json({ error: 'Invalid payoutMode' });
  const trainer = await prisma.trainer.upsert({ where: { userId }, create: { userId, payoutMode }, update: { payoutMode } });
  res.json({ ok: true, payoutMode: trainer.payoutMode });
});

r.post('/test-session', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (!trainer) return res.status(404).json({ error: 'Trainer profile not found' });

  const priceCents = Number(req.body?.priceCents ?? 6000);
  const gymId = String(req.body?.gymId || 'g1');
  const minutes = Number(req.body?.minutes ?? 60);

  const member = await prisma.user.upsert({
    where: { email: 'demo-member@duoaxs.test' },
    update: {},
    create: { email: 'demo-member@duoaxs.test', role: 'MEMBER', name: 'Demo Member' }
  });

  const now = new Date();
  const end = new Date(now.getTime() + minutes * 60000);

  const session = await prisma.session.create({
    data: { memberId: member.id, trainerId: trainer.id, gymId, priceCents, startedAt: now, endedAt: end, status: 'completed' }
  });

  res.json({ ok: true, session });
});

r.get('/earnings', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (!trainer) return res.status(404).json({ error: 'Trainer profile not found' });
  const commissionPct = Math.max(0, Math.min(1, Number(process.env.PAYOUT_COMMISSION_PCT || 0.20)));

  let start, end;
  if (req.query.start && req.query.end) {
    start = new Date(String(req.query.start)); start.setHours(0,0,0,0);
    end = new Date(String(req.query.end));     end.setHours(23,59,59,999);
  } else {
    const period = String(req.query.period || 'week').toLowerCase();
    start = period === 'month' ? (()=>{ const dt=new Date(); dt.setDate(1); dt.setHours(0,0,0,0); return dt; })() : mondayStart(new Date());
    end = new Date();
  }

  const sessions = await prisma.session.findMany({
    where: { trainerId: trainer.id, status: 'completed', startedAt: { gte: start, lte: end } },
    select: { priceCents: true }
  });

  const gross = sessions.reduce((sum, s) => sum + Number(s.priceCents || 0), 0);
  const net = Math.round(gross * (1 - commissionPct));
  res.json({ range: { start: start.toISOString(), end: end.toISOString() }, sessions: sessions.length, grossCents: gross, commissionPct, netCents: net });
});

r.get('/earnings/series', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (!trainer) return res.status(404).json({ error: 'Trainer profile not found' });

  const weeks = Math.min(52, Math.max(1, Number(req.query.weeks || 12)));
  const commissionPct = Math.max(0, Math.min(1, Number(process.env.PAYOUT_COMMISSION_PCT || 0.20)));

  const startBase = mondayStart(new Date());
  const buckets = [];
  for(let i=weeks-1;i>=0;i--){
    const start = addDays(startBase, -7*i);
    const end = addDays(start, 7);
    buckets.push({ start, end });
  }

  const sessions = await prisma.session.findMany({
    where: { trainerId: trainer.id, status: 'completed', startedAt: { gte: buckets[0].start, lte: buckets[buckets.length-1].end } },
    select: { priceCents: true, startedAt: true }
  });

  const series = buckets.map(b => {
    const items = sessions.filter(s => s.startedAt >= b.start && s.startedAt < b.end);
    const gross = items.reduce((sum, s) => sum + Number(s.priceCents||0), 0);
    const net = Math.round(gross * (1 - commissionPct));
    return { start: fmtISODate(b.start), end: fmtISODate(addDays(b.end,-1)), sessions: items.length, grossCents: gross, netCents: net };
  });

  res.json({ weeks, commissionPct, series });
});

r.get('/earnings/export', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.findUnique({ where: { userId }, include: { user: true } });
  if (!trainer) return res.status(404).json({ error: 'Trainer profile not found' });

  const start = new Date(String(req.query.start || new Date(Date.now()-30*864e5)));
  const end = new Date(String(req.query.end || new Date()));
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);

  const commissionPct = Math.max(0, Math.min(1, Number(process.env.PAYOUT_COMMISSION_PCT || 0.20)));

  const sessions = await prisma.session.findMany({
    where: { trainerId: trainer.id, status: 'completed', startedAt: { gte: start, lte: end } },
    orderBy: { startedAt: 'asc' },
    select: { id: true, startedAt: true, priceCents: true, gymId: true }
  });

  const lines = [['session_id','date','gym_id','price_usd','net_usd']];
  for(const s of sessions){
    const gross = (Number(s.priceCents||0)/100).toFixed(2);
    const net = (Number(s.priceCents||0)*(1-commissionPct)/100).toFixed(2);
    lines.push([s.id, s.startedAt.toISOString(), s.gymId, gross, net]);
  }
  const csv = lines.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="duoaxs_trainer_earnings_${fmtISODate(start)}_to_${fmtISODate(end)}.csv"`);
  res.send(csv);
});

r.get('/earnings/statement.pdf', authRequired, async (req, res) => {
  const userId = req.user?.sub;
  const trainer = await prisma.trainer.findUnique({ where: { userId }, include: { user: true } });
  if (!trainer) return res.status(404).json({ error: 'Trainer profile not found' });

  const commissionPct = Math.max(0, Math.min(1, Number(process.env.PAYOUT_COMMISSION_PCT || 0.20)));

  let start, end;
  if (req.query.start && req.query.end) {
    start = new Date(String(req.query.start)); start.setHours(0,0,0,0);
    end   = new Date(String(req.query.end));   end.setHours(23,59,59,999);
  } else {
    const period = String(req.query.period||'week').toLowerCase();
    start = period==='month' ? (()=>{ const dt=new Date(); dt.setDate(1); dt.setHours(0,0,0,0); return dt; })() : mondayStart(new Date());
    end = new Date();
  }

  const sessions = await prisma.session.findMany({
    where: { trainerId: trainer.id, status:'completed', startedAt: { gte: start, lte: end } },
    orderBy: { startedAt: 'asc' },
    select: { id:true, startedAt:true, priceCents:true, gymId:true }
  });

  const gross = sessions.reduce((s,x)=>s+Number(x.priceCents||0),0);
  const net = Math.round(gross*(1-commissionPct));

  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="duoaxs_trainer_statement_${fmtISODate(start)}_to_${fmtISODate(end)}.pdf"`);

  const doc = new PDFDocument({ size:'A4', margin:50 });
  doc.pipe(res);

  doc.fontSize(18).text('DuoAxs – Trainer Payout Statement');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#555').text(`Trainer: ${trainer.user?.name||trainer.user?.email||trainer.id}`);
  doc.text(`Range: ${fmtISODate(start)} → ${fmtISODate(end)}`);
  doc.text(`Commission: ${Math.round(commissionPct*100)}%`);
  doc.moveDown();

  doc.fontSize(12).fillColor('#000').text(`Gross: $${(gross/100).toFixed(2)}`);
  doc.text(`Net (after commission): $${(net/100).toFixed(2)}`);
  doc.text(`Sessions: ${sessions.length}`);
  doc.moveDown();

  doc.fontSize(12).text('Sessions');
  doc.moveDown(0.5).fontSize(10);
  const headers = ['Date', 'Gym', 'Price', 'Net'];
  const colX = [50, 200, 350, 430];
  headers.forEach((h,i)=> doc.text(h, colX[i], doc.y));
  doc.moveDown(0.5);
  sessions.forEach(s => {
    const price = Number(s.priceCents||0);
    doc.text(new Date(s.startedAt).toISOString().slice(0,10), colX[0], doc.y);
    doc.text(String(s.gymId), colX[1], doc.y);
    doc.text(`$${(price/100).toFixed(2)}`, colX[2], doc.y);
    doc.text(`$${(price*(1-commissionPct)/100).toFixed(2)}`, colX[3], doc.y);
    doc.moveDown(0.2);
  });

  doc.end();
});

export default r;
