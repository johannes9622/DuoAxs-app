import 'dotenv/config';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const prisma = new PrismaClient();

const DEFAULT_PLAN = Number(process.env.RESET_DEFAULT_PLAN_CREDITS || 12);
const DAY = String(process.env.RESET_DAY_OF_MONTH || '1');
const H = Number(process.env.RESET_HOUR || 4);
const M = Number(process.env.RESET_MINUTE || 0);

// Cron: minute hour day-of-month * * (monthly)
const expr = `${M} ${H} ${DAY} * *`;

async function resetMonthlyPlanCredits(){
  log.info({ DEFAULT_PLAN }, 'Running monthly plan credit reset');
  // Get all wallets; set planCredits to DEFAULT_PLAN and set nextResetAt to next month (same day)
  const wallets = await prisma.creditWallet.findMany({});
  const ops = [];
  const now = new Date();
  for(const w of wallets){
    // Compute next month same day (fallback to +30d if overflow)
    const next = new Date(now);
    next.setMonth(next.getMonth()+1);
    const d = Number(DAY);
    next.setDate(Math.min(d, 28)); // simple safe cap
    next.setHours(H, M, 0, 0);

    ops.push(prisma.creditWallet.update({
      where: { userId: w.userId },
      data: { planCredits: DEFAULT_PLAN, nextResetAt: next }
    }));
  }
  await prisma.$transaction(ops).catch(e=>{
    log.error(e, 'Reset transaction failed');
  });
  log.info({ count: wallets.length }, 'Monthly reset complete');
}

// Also run once on start if nextResetAt is past due
async function catchUp(){
  const due = await prisma.creditWallet.findMany({
    where: { OR: [{ nextResetAt: null }, { nextResetAt: { lte: new Date() } }] }
  });
  if(due.length){
    log.info({ due: due.length }, 'Catch-up reset for overdue wallets');
    for(const w of due){
      await prisma.creditWallet.update({ where: { userId: w.userId }, data: { planCredits: DEFAULT_PLAN, nextResetAt: new Date(Date.now()+30*864e5) } });
    }
  }
}

await catchUp();

cron.schedule(expr, resetMonthlyPlanCredits, { timezone: 'UTC' });
log.info({ expr }, 'Worker scheduled. Waiting for next tick…');

// Keep alive
setInterval(()=>{}, 1<<30);
