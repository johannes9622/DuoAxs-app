import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, clearToken } from '../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

type Overview = { user:{id:string,email:string,name?:string}, credits:{planCredits:number, topUpCredits:number, total:number, nextResetAt?:string|null}, metrics:{recentCheckins:number} };
type Gym = { id:string, name:string, tier?:string, address?:string, distanceKm?:number, isOpenNow?:boolean };

export default function Dashboard(){
  const [ov,setOv] = useState<Overview|null>(null);
  const [gyms,setGyms] = useState<Gym[]>([]);
  const [err,setErr] = useState('');
  const [lat,setLat] = useState('');
  const [lng,setLng] = useState('');

  async function loadOverview(){
    try{
      const token = getToken();
      if(!token){ location.href='/login-magic'; return; }
      const r = await fetch(API_BASE+'/member/overview', { headers: { 'Authorization':'Bearer '+token }});
      const j = await r.json();
      if(!r.ok) throw new Error(j.error||'Failed to load');
      setOv(j);
    }catch(e:any){ setErr(e.message); }
  }

  async function findGyms(){
    try{
      if(!lat || !lng) throw new Error('Enter lat/lng (e.g., 29.76, -95.36)');
      const r = await fetch(API_BASE+`/public/gyms/near?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radiusKm=10`);
      const j = await r.json();
      if(!r.ok) throw new Error(j.error||'Failed to load gyms');
      setGyms(j.gyms || []);
    }catch(e:any){ setErr(e.message); }
  }

  useEffect(()=>{ loadOverview(); }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>Welcome{ov?.user?.name ? ', '+ov.user.name : ''}</h1>
        <div>
          <Link className="link" href="/login-magic">Auth</Link>
          <button className="btn" onClick={()=>{ clearToken(); location.reload(); }} style={{marginLeft:8}}>Sign out</button>
        </div>
      </div>

      {err && <p style={{color:'red'}}>{err}</p>}

      <div className="grid">
        <div className="card">
          <div className="badge">Credits</div>
          <div className="kpi" style={{marginTop:6}}>{ov ? ov.credits.total : '—'}</div>
          <div className="sub">Plan: {ov?.credits.planCredits||0} • Top‑ups: {ov?.credits.topUpCredits||0}</div>
          <div className="sub" style={{marginTop:6}}>Resets: {ov?.credits.nextResetAt ? new Date(ov.credits.nextResetAt).toLocaleDateString() : '—'}</div>
          <div style={{marginTop:10}}><a className="btn" href="/topup">Buy credits</a></div>
        </div>
        <div className="card">
          <div className="badge">Activity</div>
          <div className="kpi" style={{marginTop:6}}>{ov ? ov.metrics.recentCheckins : '—'}</div>
          <div className="sub">Check‑ins (last 30 days)</div>
        </div>
      </div>

      <div className="card">
        <h3>Find Nearby Gyms</h3>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <label>Lat</label><input className="input" value={lat} onChange={e=>setLat(e.target.value)} style={{width:120}} />
          <label>Lng</label><input className="input" value={lng} onChange={e=>setLng(e.target.value)} style={{width:120}} />
          <button className="btn" onClick={findGyms}>Search</button>
        </div>
        <table className="table" style={{marginTop:12}}>
          <thead><tr><th>Gym</th><th>Tier</th><th>Distance</th><th>Status</th></tr></thead>
          <tbody>
            {gyms.map(g=>(
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.tier||'-'}</td>
                <td>{g.distanceKm ? g.distanceKm.toFixed(1)+' km' : '-'}</td>
                <td>{g.isOpenNow ? 'Open' : '—'}</td>
              </tr>
            ))}
            {!gyms.length && <tr><td colSpan={4} className="sub">Enter a location and search</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Suggested Trainers</h3>
        <p className="sub">Coming soon: personalized matches by specialty, rating, and availability near you.</p>
      </div>
    </div>
  );
}
