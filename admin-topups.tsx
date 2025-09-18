import { useState, useEffect } from 'react';
import { getToken } from '../lib/auth';
import Link from 'next/link';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
type Row = { id:string, date:string, userId:string, email:string, credits:number, amountUsd:string, session:string };
export default function AdminTopups(){
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function load(){
    setLoading(true); setErr('');
    try{
      const token = getToken();
      if(!token) throw new Error('Please login first.');
      if(!start || !end) throw new Error('Pick start and end dates');
      const r = await fetch(`${API_BASE}/admin/topups?start=${start}&end=${end}`, { headers:{ 'Authorization':'Bearer '+token }});
      const j = await r.json();
      if(!r.ok) throw new Error(j.error||'Failed to fetch');
      setRows(j.items || []);
    }catch(e:any){ setErr(e.message); }
    finally{ setLoading(false); }
  }
  function exportCSV(){
    const token = getToken();
    if(!token){ setErr('Please login first.'); return; }
    if(!start || !end){ setErr('Pick start and end dates'); return; }
    const url = `${API_BASE}/admin/topups/export?start=${start}&end=${end}`;
    fetch(url, { headers:{ 'Authorization':'Bearer '+token }}).then(async r=>{
      if(!r.ok){ setErr('Export failed'); return; }
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `duoaxs_topups_${start}_to_${end}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  useEffect(()=>{ const today = new Date(); const startISO = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10); const endISO = today.toISOString().slice(0,10); setStart(startISO); setEnd(endISO); }, []);
  return (<div className="container">
    <div className="header"><h1>Admin • Top‑Ups</h1><Link className="link" href="/">← Back</Link></div>
    {err && <p style={{color:'red'}}>{err}</p>}
    <div className="card"><div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      <label>Start</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} />
      <label>End</label><input type="date" value={end} onChange={e=>setEnd(e.target.value)} />
      <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>
      <button onClick={exportCSV} style={{marginLeft:8}}>Export CSV</button>
    </div></div>
    <div className="card"><table className="table"><thead><tr><th>Date</th><th>User</th><th>Email</th><th>Credits</th><th>Amount</th><th>Session</th></tr></thead>
      <tbody>{rows.map(r=>(<tr key={r.id}><td>{new Date(r.date).toLocaleString()}</td><td><code>{r.userId}</code></td><td>{r.email}</td><td>{r.credits}</td><td>${r.amountUsd}</td><td className="sub">{r.session}</td></tr>))}
      {!rows.length && <tr><td colSpan={6} className="sub">No top‑ups in range.</td></tr>}</tbody></table></div>
  </div>);
}