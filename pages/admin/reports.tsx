// pages/admin/reports.tsx
import { useEffect, useState } from 'react';
import { getToken } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

type Report = { id: string | number; title: string; summary?: string };

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [msg, setMsg] = useState('Loading…');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/reports`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const j = await res.json();
        if (!res.ok) {
          setMsg(`Error: ${j.error || 'failed to load reports'}`);
          return;
        }
        setReports(Array.isArray(j) ? j : j.items ?? []);
        setMsg('');
      } catch (err) {
        setMsg(`Error: ${(err as Error).message}`);
      }
    })();
  }, []);

  return (
    <div className="container">
      <h1>Admin • Reports</h1>
      {msg && <p>{msg}</p>}
      {!msg && reports.length === 0 && <p>No reports yet.</p>}
      <ul>
        {reports.map(r => (
          <li key={r.id} style={{ marginBottom: 8 }}>
            <strong>{r.title}</strong>
            {r.summary ? <div>{r.summary}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
