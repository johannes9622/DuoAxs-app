// apps/api/backend/src/routes/auth.magic.js (DEEPLINK VERSION)
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../index.js';
import { sendEmail } from '../lib/email.js';

const r = Router();
function sign(p){ return jwt.sign(p, process.env.JWT_SECRET||'dev', { expiresIn:'30d' }); }

const SCHEME = process.env.DEEP_LINK_SCHEME || 'duoaxs';
const APP_WEB_BASE = process.env.PUBLIC_MEMBER_BASE_URL || 'https://app.duoaxs.com';

r.post('/request', async (req,res)=>{
  const email=String(req.body?.email||'').toLowerCase();
  if(!email) return res.status(400).json({error:'Email required'});
  let user = await prisma.user.findUnique({ where: { email } }).catch(()=>null);
  if(!user){ user = await prisma.user.create({ data: { email, role:'MEMBER', name: email.split('@')[0] } }).catch(()=>null); }
  const token=sign({sub:user.id,email});

  const webLink = `${APP_WEB_BASE}/login-magic?token=${encodeURIComponent(token)}`;
  const appLink = `${SCHEME}://login-magic?token=${encodeURIComponent(token)}`;

  try{
    await sendEmail({
      to: email,
      subject: 'Your DuoAxs sign-in link',
      html: `<p>Tap to sign in:</p>
             <p><a href="${appLink}">Open in DuoAxs app</a> (best on iOS/Android)</p>
             <p>Or use the web: <a href="${webLink}">${webLink}</a></p>
             <hr/><p>If the app link doesn’t open, your device will use the web link instead.</p>`,
      text: `Open in app: ${appLink}\nOr in web: ${webLink}`
    });
  }catch(e){
    console.warn('Email send failed:', e?.message);
  }

  res.json({ ok:true, magicLink: webLink, deepLink: appLink });
});

r.get('/verify', async (req,res)=>{
  const token=String(req.query?.token||'');
  try{ const payload=jwt.verify(token, process.env.JWT_SECRET||'dev'); const appToken=sign({sub:payload.sub,email:payload.email}); res.json({ ok:true, token: appToken }); }
  catch{ res.status(401).json({error:'Invalid or expired token'}); }
});
export default r;
