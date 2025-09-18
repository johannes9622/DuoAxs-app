/**
 * Seed Stripe products & prices for credit packages.
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/seed.stripe.mjs
 * Env (optional): CURRENCY=usd, PACKS='[{"name":"Credits 12","credits":12,"unit_amount":3000},{"name":"Credits 20","credits":20,"unit_amount":4600},{"name":"Credits 36","credits":36,"unit_amount":7800}]'
 * Prints newly created Price IDs so you can copy into API .env.
 */
import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = process.env.CURRENCY || 'usd';
const packs = process.env.PACKS ? JSON.parse(process.env.PACKS) : [
  { key:'CREDITS_12', name:'DuoAxs Credits – 12', credits:12, unit_amount:3000 },
  { key:'CREDITS_20', name:'DuoAxs Credits – 20', credits:20, unit_amount:4600 },
  { key:'CREDITS_36', name:'DuoAxs Credits – 36', credits:36, unit_amount:7800 }
];

const created = [];
for (const p of packs){
  const prod = await stripe.products.create({ name: p.name, metadata: { credits: String(p.credits) } });
  const price = await stripe.prices.create({ currency, unit_amount: p.unit_amount, product: prod.id });
  created.push({ key: p.key, product: prod.id, price: price.id, credits: p.credits, amount: p.unit_amount });
}

console.log('\nStripe seed complete. Set these in apps/api/backend/.env:');
for (const c of created){
  console.log(`PRICE_${c.key}=${c.price}`);
  console.log(`CREDITS_${c.key}=${c.credits}`);
}
