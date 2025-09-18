// apps/admin/pages/admin-payouts.tsx
import { useState } from 'react';
import { getToken } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export default function AdminPayouts(){
  const [msg,setMsg] = useState('');
  async function runWeekly(){
    setMsg('Running…');
    const r = await fetch(API+'/payouts/batch-weekly', { method:'POST', headers:{ 'Authorization':'Bearer '+getToken() }});
    const j = await r.json();
    if(!r.ok){ setMsg('Error: ' + (j.error||'failed')); return; }
    setMsg('Done: ' + j.results.length + ' trainer(s) processed');
  }
  return (
    <div className="container">
      <div className="header"><h1>Admin • Payouts</h1></div>
      <div className="card">
        <p>Trigger weekly batch payouts for the prior week. Requires admin auth and Stripe Connect.</p>
        <button onClick={runWeekly}>Run Weekly Payouts</button>
        {msg && <p style={{marginTop:8}}>{msg}</p>}
      </div>
    </div>
  );
}
