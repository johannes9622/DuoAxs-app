import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import './passport.js';
import { prisma } from '../../index.js';
const r = Router();
function sign(p){ return jwt.sign(p, process.env.JWT_SECRET||'dev', { expiresIn:'30d' }); }
r.get('/google', passport.authenticate('google', { scope:['profile','email'] }));
r.get('/google/callback', passport.authenticate('google', { session:false, failureRedirect: (process.env.OAUTH_FAILURE_URL||'/login-magic?err=google') }), async (req,res)=>{
  const profile = req.user || { id:'u_demo', email:'user@duoaxs.test' };
  let user = await prisma.user.findUnique({ where: { email: profile.email } }).catch(()=>null);
  if(!user){ user = await prisma.user.create({ data: { email: profile.email, role:'MEMBER', name: profile.email.split('@')[0] } }); }
  const token=sign({sub:user.id,email:user.email});
  const url=new URL(process.env.OAUTH_SUCCESS_URL|| (process.env.PUBLIC_MEMBER_BASE_URL||'http://localhost:3000'));
  url.pathname='/login-magic'; url.searchParams.set('token', token);
  res.redirect(url.toString());
});
r.get('/apple', passport.authenticate('apple'));
r.get('/apple/callback', passport.authenticate('apple', { session:false, failureRedirect: (process.env.OAUTH_FAILURE_URL||'/login-magic?err=apple') }), async (req,res)=>{
  const profile = req.user || { id:'u_demo', email:'user@duoaxs.test' };
  let user = await prisma.user.findUnique({ where: { email: profile.email } }).catch(()=>null);
  if(!user){ user = await prisma.user.create({ data: { email: profile.email, role:'MEMBER', name: profile.email.split('@')[0] } }); }
  const token=sign({sub:user.id,email:user.email});
  const url=new URL(process.env.OAUTH_SUCCESS_URL|| (process.env.PUBLIC_MEMBER_BASE_URL||'http://localhost:3000'));
  url.pathname='/login-magic'; url.searchParams.set('token', token);
  res.redirect(url.toString());
});
export default r;
