// apps/member/pages/checkin.tsx
import { useState } from 'react';
import { getToken } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export default function Checkin() {
  const [gymId, setGymId] = useState('g1');
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');

  async function submit() {
    setErr('');
    setResult(null);

    try {
      const res = await fetch(`${API}/checkins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ gymId }),
      });

      const j = await res.json();

      if (!res.ok) {
        setErr(j.error || 'Failed');
        return;
      }

      setResult(j);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Check-In</h1>
      </div>

      <div className="card">
        <label>Gym ID</label>
        <input
          value={gymId}
          onChange={(e) => setGymId(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={submit} style={{ marginLeft: 8 }}>
          Use 1 credit
        </button>
      </div>

      {err && (
        <p style={{ color: 'red' }}>
          {err}
        </p>
      )}

      {result && (
        <div className="card">
          <p>Consumed: {result.wallet?.planCredits} - Top-Ups: {result.wallet?.topupCredits}</p>
          <p>Check-in ID: {result.checkin?.id}</p>
        </div>
      )}
    </div>
  );
}
