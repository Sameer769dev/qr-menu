'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';

export default function TablesPage() {
  const supabase = createClient();
  const { restaurant } = useRestaurant();
  const [tables, setTables] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [newTable, setNewTable] = useState('');
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at');
    setTables(data || []);
    setLoading(false);
  }, [supabase, restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!origin) return;
    async function generate() {
      const entries = await Promise.all(
        tables.map(async (t) => {
          const url = `${origin}/m/${restaurant.slug}?t=${t.id}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 512,
            margin: 2,
            color: { dark: '#1f2937', light: '#ffffff' },
          });
          return [t.id, dataUrl];
        })
      );
      setQrCodes(Object.fromEntries(entries));
    }
    generate();
  }, [tables, origin, restaurant.slug]);

  async function addTable(e) {
    e.preventDefault();
    if (!newTable.trim()) return;
    await supabase
      .from('tables')
      .insert({ restaurant_id: restaurant.id, name: newTable.trim() });
    setNewTable('');
    load();
  }

  async function deleteTable(t) {
    if (!confirm(`Delete "${t.name}"? Its QR code will stop working.`)) return;
    await supabase.from('tables').delete().eq('id', t.id);
    load();
  }

  function downloadQR(t) {
    const link = document.createElement('a');
    link.download = `${restaurant.slug}-${t.name.replace(/\s+/g, '-')}-qr.png`;
    link.href = qrCodes[t.id];
    link.click();
  }

  function printAll() {
    const win = window.open('', '_blank');
    const cards = tables
      .map(
        (t) => `
        <div class="qr-card">
          <h2>${restaurant.name}</h2>
          <img src="${qrCodes[t.id]}" alt="QR" />
          <h3>${t.name}</h3>
          <p>Scan to view menu &amp; order</p>
        </div>`
      )
      .join('');
    win.document.write(`
      <html>
        <head>
          <title>QR codes — ${restaurant.name}</title>
          <style>
            body { font-family: sans-serif; margin: 0; }
            .qr-card {
              width: 100%; height: 100vh; display: flex; flex-direction: column;
              align-items: center; justify-content: center; page-break-after: always;
              text-align: center;
            }
            .qr-card img { width: 340px; height: 340px; }
            .qr-card h2 { margin: 0 0 12px; font-size: 28px; }
            .qr-card h3 { margin: 12px 0 4px; font-size: 24px; }
            .qr-card p { margin: 0; color: #555; }
          </style>
        </head>
        <body>${cards}<script>window.onload = () => window.print();</script></body>
      </html>`);
    win.document.close();
  }

  if (loading) return <p className="text-gray-500">Loading tables…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Tables &amp; QR codes</h1>
        <div className="flex gap-2">
          {tables.length > 0 && (
            <button
              className="btn-secondary"
              onClick={printAll}
              disabled={Object.keys(qrCodes).length < tables.length}
            >
              🖨️ Print all
            </button>
          )}
          <form onSubmit={addTable} className="flex gap-2">
            <input
              className="input w-40"
              placeholder="e.g. Table 1"
              value={newTable}
              onChange={(e) => setNewTable(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Add table
            </button>
          </form>
        </div>
      </div>

      {tables.length === 0 && (
        <div className="card mt-8 p-8 text-center text-gray-500">
          Add your tables — each one gets its own QR code to print and place on
          the table.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => (
          <div key={t.id} className="card p-4 text-center">
            <h3 className="font-semibold">{t.name}</h3>
            {qrCodes[t.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodes[t.id]}
                alt={`QR for ${t.name}`}
                className="mx-auto mt-2 h-40 w-40"
              />
            ) : (
              <div className="mx-auto mt-2 h-40 w-40 animate-pulse rounded bg-gray-100" />
            )}
            <p className="mt-1 break-all text-xs text-gray-400">
              {origin}/m/{restaurant.slug}?t={t.id.slice(0, 8)}…
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button className="btn-secondary" onClick={() => downloadQR(t)}>
                Download PNG
              </button>
              <button className="btn-danger" onClick={() => deleteTable(t)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
