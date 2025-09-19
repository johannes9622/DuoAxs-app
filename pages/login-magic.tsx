import { useEffect, useState } from 'react';
import { setToken } from '../lib/auth';
import Link from 'next/link';
const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
export default function LoginMagic(){
  const [email, setEmail] = useState('');
  const [magic, setMagic] = useState('');
  const [err, setErr] = useState('');
  async function requestLink(){
    setErr(''); setMagic('');
    const r = await fetch(API + '/auth/magic/request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    const j = await r.json();
    if(!r.ok){ setErr(j.error||'Failed'); return; }
    setMagic(j.magicLink);
  }
  useEffect(()=>{
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if(token){
      fetch(API + '/auth/magic/verify?token=' + encodeURIComponent(token))
        .then(r=>r.json())
        .then(j=>{ if(j.token){ setToken(j.token); location.href='/'; } else setErr('Magic link invalid or expired'); })
        .catch(()=> setErr('Magic link invalid or expired'));
    }
  }, []);
  return (
    <div className="container">
      <div className="header"><h1>DuoAxs</h1><Link className="link" href="/">← Dashboard</Link></div>
      <div className="card">
        <h3>Sign in with Magic Link</h3>
        <input className="input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%'}} />
        <div style={{marginTop:8}}><button className="btn" onClick={requestLink}>Send Link</button></div>
        {magic && <p className="sub" style={{marginTop:8}}>Demo magic link (click): <a className="link" href={magic}>{magic}</a></p>}
        {err && <p style={{color:'red'}}>{err}</p>}
      </div>
    </div>
  );
}
