import { useState } from 'react';
import { getToken } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export default function AdminTopups() {
  const [msg, setMsg] = useState('');

  async function runTopup() {
    setMsg('Processing...');
    try {
      const res = await fetch(`${API}/topups/manual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 100 }), // Example payload
      });

      if (!res.ok) {
        const err = await res.json();
        setMsg(`Error: ${err.error || 'failed'}`);
        return;
      }

      const data = await res.json();
      setMsg(`Success: Topup of $${data.amount} completed!`);
    } catch (err) {
      setMsg(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <div className="container">
      <div className="header"><h1>Admin • Topups</h1></div>
      <div className="card">
        <p>Trigger a manual topup for testing/admin purposes.</p>
        <button onClick={runTopup}>Run Topup</button>
        <p style={{ marginTop: 8 }}>{msg}</p>
      </div>
    </div>
  );
}
