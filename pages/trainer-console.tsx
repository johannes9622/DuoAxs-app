import { useEffect, useState } from 'react';
import { getToken } from '../lib/auth'; // <- adjust to ../lib/auth if file is in pages/

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

type Session = {
  id: string;
  startedAt: string;
  endedAt?: string;
  priceCents: number;
  status: string;
  gymId: string;
};

type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
  trainer?: { id: string; payoutMode: string };
};

type Earn = {
  range: { start: string; end: string };
  sessions: number;
  grossCents: number;
  commissionPct: number;
  netCents: number;
};

type Bucket = { start: string; end: string; sessions: number; grossCents: number; netCents: number };

export default function TrainerConsole() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState('WEEKLY');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [gymId, setGymId] = useState('g1');
  const [priceCents, setPriceCents] = useState(6000);
  const [minutes, setMinutes] = useState(60);
  const [logging, setLogging] = useState(false);
  const [wtd, setWtd] = useState<Earn | null>(null);
  const [mtd, setMtd] = useState<Earn | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeEarn, setRangeEarn] = useState<Earn | null>(null);
  const [loadingRange, setLoadingRange] = useState(false);
  const [series, setSeries] = useState<Bucket[]>([]);
  const [weeks, setWeeks] = useState(12);

  const fmt = (c: number) => (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  async function loadMe() {
    setErr('');
    const token = getToken();
    if (!token) {
      setErr('Please login first.');
      return;
    }
    const r = await fetch(`${API_BASE}/trainer/me`, { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Failed');
    setUser(j.user);
    setMode(j.user?.trainer?.payoutMode || 'WEEKLY');
  }

  async function loadSessions() {
    const token = getToken();
    if (!token) return;
    const r = await fetch(`${API_BASE}/trainer/sessions?sinceDays=60`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const j = await r.json();
    if (r.ok) setSessions(j.sessions || []);
  }

  async function loadEarnings() {
    const token = getToken();
    if (!token) return;

    let r = await fetch(`${API_BASE}/trainer/earnings?period=week`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (r.ok) setWtd(await r.json());

    r = await fetch(`${API_BASE}/trainer/earnings?period=month`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (r.ok) setMtd(await r.json());
  }

  async function loadSeries() {
    const token = getToken();
    if (!token) return;
    const r = await fetch(`${API_BASE}/trainer/earnings/series?weeks=${weeks}`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const j = await r.json();
    if (r.ok) setSeries(j.series || []);
  }

  async function saveMode() {
    setSaving(true);
    setErr('');
    try {
      const token = getToken();
      if (!token) throw new Error('Please login first.');
      const r = await fetch(`${API_BASE}/trainer/payout-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ payoutMode: mode }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function logTest() {
    setLogging(true);
    setErr('');
    try {
      const token = getToken();
      if (!token) throw new Error('Please login first.');
      const r = await fetch(`${API_BASE}/trainer/test-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ gymId, priceCents, minutes }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      await Promise.all([loadSessions(), loadEarnings(), loadSeries()]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLogging(false);
    }
  }

  async function fetchRange() {
    setLoadingRange(true);
    setErr('');
    try {
      const token = getToken();
      if (!token) throw new Error('Please login first.');
      const qs = new URLSearchParams({ start: rangeStart, end: rangeEnd }).toString();
      const r = await fetch(`${API_BASE}/trainer/earnings?${qs}`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      setRangeEarn(j);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoadingRange(false);
    }
  }

  function downloadCSV() {
    const token = getToken();
    if (!token) {
      setErr('Please login first.');
      return;
    }
    const qs = new URLSearchParams({
      start: rangeStart || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
      end: rangeEnd || new Date().toISOString().slice(0, 10),
    }).toString();
    const url = `${API_BASE}/trainer/earnings/export?${qs}`;
    fetch(url, { headers: { Authorization: 'Bearer ' + token } }).then(async (r) => {
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'duoaxs_trainer_earnings.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  function downloadPDF(kind: 'week' | 'month' | 'custom') {
    const token = getToken();
    if (!token) {
      setErr('Please login first.');
      return;
    }
    let url = `${API_BASE}/trainer/earnings/statement.pdf`;
    if (kind === 'custom') {
      if (!rangeStart || !rangeEnd) {
        setErr('Pick start/end');
        return;
      }
      url += `?start=${rangeStart}&end=${rangeEnd}`;
    } else {
      url += `?period=${kind}`;
    }
    fetch(url, { headers: { Authorization: 'Bearer ' + token } }).then(async (r) => {
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'duoaxs_trainer_statement.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  useEffect(() => {
    (async () => {
      try {
        await loadMe();
        await loadSessions();
        await loadEarnings();
        await loadSeries();
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [weeks]);

  const maxNet = Math.max(1, ...series.map((b) => b.netCents || 0));

  return (
    <div className="container">
      <div className="header"><h1>Trainer Console</h1></div>

      {err && <p style={{ color: 'red' }}>{err}</p>}

      <div className="card">
        <h3>Earnings Timeline</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '8px 0', borderBottom: '1px dashed #eee' }}>
          {series.map((b, i) => {
            const h = Math.round((b.netCents / maxNet) * 140);
            return (
              <div
                key={i}
                title={`${b.start} → ${b.end}: ${fmt(b.netCents)}`}
                style={{ width: 20, height: h, background: '#d1e3ff', borderRadius: 4 }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, opacity: 0.75 }}>
          <span>{series[0]?.start || ''}</span>
          <span>{series[series.length - 1]?.end || ''}</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Show last </label>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            <option value={8}>8 weeks</option>
            <option value={12}>12 weeks</option>
            <option value={24}>24 weeks</option>
            <option value={52}>52 weeks</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Earnings (WTD / MTD)</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="badge">Week-to-date</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{wtd ? fmt(wtd.netCents) : '—'}</div>
            <div style={{ opacity: 0.7 }}>
              Gross {wtd ? fmt(wtd.grossCents) : '—'} • {wtd ? Math.round(wtd.commissionPct * 100) : '—'}% fee
            </div>
          </div>
          <div>
            <div className="badge">Month-to-date</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{mtd ? fmt(mtd.netCents) : '—'}</div>
            <div style={{ opacity: 0.7 }}>
              Gross {mtd ? fmt(mtd.grossCents) : '—'} • {mtd ? Math.round(mtd.commissionPct * 100) : '—'}% fee
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Custom Range, CSV & PDF</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Start</label>
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
          <label>End</label>
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
          <button onClick={fetchRange} disabled={loadingRange || !rangeStart || !rangeEnd}>
            {loadingRange ? 'Loading…' : 'Calculate'}
          </button>
          <button onClick={downloadCSV} style={{ marginLeft: 8 }}>Download CSV</button>
          <button onClick={() => downloadPDF('week')} style={{ marginLeft: 8 }}>Download WTD PDF</button>
          <button onClick={() => downloadPDF('month')} style={{ marginLeft: 8 }}>Download MTD PDF</button>
          <button onClick={() => downloadPDF('custom')} style={{ marginLeft: 8 }}>Download Custom PDF</button>
          {rangeEarn && (
            <span style={{ marginLeft: 12 }}>
              Net: <b>{fmt(rangeEarn.netCents)}</b> (Gross {fmt(rangeEarn.grossCents)}, {Math.round(rangeEarn.commissionPct * 100)}% fee)
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Log Test Session</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label>Gym ID</label>
          <input value={gymId} onChange={(e) => setGymId(e.target.value)} style={{ width: 120 }} />
          <label>Price (cents)</label>
          <input type="number" value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} style={{ width: 140 }} />
          <label>Minutes</label>
          <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ width: 100 }} />
          <button onClick={logTest} disabled={logging}>{logging ? 'Logging…' : 'Add Session'}</button>
        </div>
      </div>

      <div className="card">
        <h3>Recent Sessions</h3>
        <table className="table">
          <thead>
            <tr><th>When</th><th>Gym</th><th>Status</th><th>Price</th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.startedAt).toLocaleString()}</td>
                <td><code>{s.gymId}</code></td>
                <td>{s.status}</td>
                <td>{fmt(s.priceCents)}</td>
              </tr>
            ))}
            {!sessions.length && (
              <tr><td colSpan={4} style={{ opacity: 0.7 }}>No sessions in the last 60 days.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
