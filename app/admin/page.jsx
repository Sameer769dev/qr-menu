'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 38;
const TRIAL_DAYS = 30;

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
}

function billingStatus(rest, bill) {
  if (bill?.last_paid_at) {
    const d = daysSince(bill.last_paid_at);
    if (d <= 31) return { key: 'paid', label: `Paid ${d}d ago`, cls: 'bg-emerald-100 text-emerald-700' };
    if (d <= GRACE_DAYS) return { key: 'due', label: `Due (${d}d)`, cls: 'bg-amber-100 text-amber-800' };
    return { key: 'overdue', label: `Overdue (${d}d)`, cls: 'bg-red-100 text-red-700' };
  }
  const trialEnd = bill?.trial_ends_at
    ? new Date(bill.trial_ends_at)
    : new Date(new Date(rest.created_at).getTime() + TRIAL_DAYS * DAY_MS);
  const left = Math.ceil((trialEnd.getTime() - Date.now()) / DAY_MS);
  if (left >= 0) return { key: 'trial', label: `Trial (${left}d left)`, cls: 'bg-sky-100 text-sky-700' };
  return { key: 'overdue', label: `Trial ended ${-left}d ago`, cls: 'bg-red-100 text-red-700' };
}

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [authState, setAuthState] = useState('loading');
  const [restaurants, setRestaurants] = useState([]);
  const [billing, setBilling] = useState({});
  const [stats30, setStats30] = useState({});
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: adminRow } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!adminRow) {
      setAuthState('denied');
      return;
    }

    const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
    const [restRes, billRes, ordersRes] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at'),
      supabase.from('billing').select('*'),
      supabase
        .from('orders')
        .select('restaurant_id, total, status, created_at')
        .gte('created_at', since),
    ]);

    const billMap = {};
    for (const b of billRes.data || []) billMap[b.restaurant_id] = b;

    const statMap = {};
    for (const o of ordersRes.data || []) {
      const s = (statMap[o.restaurant_id] = statMap[o.restaurant_id] || {
        orders: 0,
        revenue: 0,
        lastOrder: null,
      });
      s.orders += 1;
      if (o.status !== 'cancelled') s.revenue += Number(o.total);
      if (!s.lastOrder || o.created_at > s.lastOrder) s.lastOrder = o.created_at;
    }

    setRestaurants(restRes.data || []);
    setBilling(billMap);
    setStats30(statMap);
    setAuthState('ok');
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleSuspend(rest) {
    const action = rest.is_active ? 'Suspend' : 'Reactivate';
    if (
      !confirm(
        `${action} "${rest.name}"? ${
          rest.is_active
            ? 'Their menu and QR codes will stop working immediately.'
            : 'Their menu and QR codes will work again immediately.'
        }`
      )
    )
      return;
    setBusy(rest.id);
    await supabase
      .from('restaurants')
      .update({ is_active: !rest.is_active })
      .eq('id', rest.id);
    setBusy('');
    load();
  }

  async function markPaid(rest) {
    setBusy(rest.id);
    const existing = billing[rest.id];
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('billing').upsert({
      restaurant_id: rest.id,
      monthly_fee: existing?.monthly_fee ?? 1500,
      trial_ends_at: existing?.trial_ends_at ?? null,
      note: existing?.note ?? null,
      last_paid_at: today,
      updated_at: new Date().toISOString(),
    });
    setBusy('');
    load();
  }

  if (authState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        Checking access…
      </main>
    );
  }

  if (authState === 'denied') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
        <div>
          <div className="text-4xl">⛔</div>
          <h1 className="mt-3 font-display text-xl font-bold">Operators only</h1>
          <p className="mt-1 text-sm text-gray-500">
            This account is not a platform admin.
          </p>
          <Link href="/dashboard" className="btn-primary mt-6">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const activeCount = restaurants.filter((r) => r.is_active).length;
  const payingCount = restaurants.filter((r) => billing[r.id]?.last_paid_at).length;
  const overdue = restaurants.filter(
    (r) => billingStatus(r, billing[r.id]).key === 'overdue'
  );
  const mrr = restaurants
    .filter((r) => r.is_active && billing[r.id]?.last_paid_at)
    .reduce((s, r) => s + Number(billing[r.id]?.monthly_fee ?? 1500), 0);

  const summary = [
    { label: 'Restaurants', value: restaurants.length, icon: '🏪' },
    { label: 'Active', value: activeCount, icon: '🟢' },
    { label: 'Paying', value: payingCount, icon: '💳' },
    { label: 'Overdue', value: overdue.length, icon: '⚠️' },
    { label: 'MRR', value: `Rs. ${mrr.toFixed(0)}`, icon: '📈' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/60">
      <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 text-base">
              🛠️
            </span>
            <div>
              <span className="font-display font-bold">QR Menu — Operator</span>
              <p className="text-xs text-gray-500">Tenant & billing management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={load}>
              ↻ Refresh
            </button>
            <Link href="/dashboard" className="btn-secondary">
              My dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-up">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {summary.map((c) => (
            <div key={c.label} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{c.label}</p>
                <span className="text-lg">{c.icon}</span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight">
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {overdue.length > 0 && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            ⚠️ {overdue.length} restaurant{overdue.length > 1 ? 's' : ''} overdue:{' '}
            {overdue.map((r) => r.name).join(', ')}. Send a payment reminder or
            suspend below.
          </p>
        )}

        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">30d orders</th>
                <th className="px-4 py-3">30d revenue</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {restaurants.map((r) => {
                const bill = billing[r.id];
                const stat = stats30[r.id];
                const bs = billingStatus(r, bill);
                return (
                  <tr key={r.id} className={r.is_active ? '' : 'bg-gray-50/80 opacity-70'}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.name}</p>
                      <a
                        href={`/m/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-brand-600"
                      >
                        /m/{r.slug} ↗
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.phone || <span className="text-gray-300">—</span>}
                      {r.address && (
                        <p className="text-xs text-gray-400">{r.address}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{stat?.orders ?? 0}</td>
                    <td className="px-4 py-3 font-semibold">
                      Rs. {(stat?.revenue ?? 0).toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      Rs. {Number(bill?.monthly_fee ?? 1500).toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge-status ${bs.cls}`}>{bs.label}</span>
                      {bill?.note && (
                        <p className="mt-0.5 max-w-[160px] truncate text-xs text-gray-400">
                          {bill.note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge-status ${
                          r.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {r.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="btn-secondary px-2.5 py-1 text-xs"
                          disabled={busy === r.id}
                          onClick={() => markPaid(r)}
                          title="Record payment received today"
                        >
                          ✓ Paid today
                        </button>
                        <button
                          className="btn-secondary px-2.5 py-1 text-xs"
                          onClick={() => setEditing(r)}
                        >
                          Edit
                        </button>
                        <button
                          className={`px-2.5 py-1 text-xs ${
                            r.is_active ? 'btn-danger' : 'btn-primary'
                          }`}
                          disabled={busy === r.id}
                          onClick={() => toggleSuspend(r)}
                        >
                          {r.is_active ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {restaurants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No restaurants yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Trial = {TRIAL_DAYS} days from signup (or a custom date). Paid → Due
          after 31 days → Overdue after {GRACE_DAYS} days. Suspending flips the
          restaurant&apos;s menu offline instantly; reactivating restores it.
        </p>
      </div>

      {editing && (
        <BillingModal
          restaurant={editing}
          bill={billing[editing.id]}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </main>
  );
}

function BillingModal({ restaurant, bill, onClose, onSaved }) {
  const supabase = createClient();
  const [fee, setFee] = useState(String(bill?.monthly_fee ?? 1500));
  const [trialEnds, setTrialEnds] = useState(bill?.trial_ends_at || '');
  const [lastPaid, setLastPaid] = useState(bill?.last_paid_at || '');
  const [note, setNote] = useState(bill?.note || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const { error: err } = await supabase.from('billing').upsert({
      restaurant_id: restaurant.id,
      monthly_fee: Number(fee) || 1500,
      trial_ends_at: trialEnds || null,
      last_paid_at: lastPaid || null,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    });
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card w-full max-w-sm animate-scale-in p-6">
        <h2 className="text-lg font-bold">Billing — {restaurant.name}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="label">Monthly fee (Rs.)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Trial ends (optional)</label>
            <input
              className="input"
              type="date"
              value={trialEnds}
              onChange={(e) => setTrialEnds(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Last paid on</label>
            <input
              className="input"
              type="date"
              value={lastPaid}
              onChange={(e) => setLastPaid(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Note</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. pays via eSewa, contact Ram"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
