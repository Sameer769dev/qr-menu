'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function OverviewPage() {
  const supabase = createClient();
  const { restaurant } = useRestaurant();
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const todayStart = startOfDay(new Date());
    const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);

    const [weekOrdersRes, itemsRes, tablesRes, anyOrderRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, status, created_at, table_name')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', weekStart.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id),
      supabase
        .from('tables')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id),
    ]);

    const weekOrders = weekOrdersRes.data || [];
    const todayOrders = weekOrders.filter(
      (o) => new Date(o.created_at) >= todayStart
    );

    let bestsellers = [];
    if (todayOrders.length > 0) {
      const validIds = todayOrders
        .filter((o) => o.status !== 'cancelled')
        .map((o) => o.id);
      if (validIds.length > 0) {
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('item_name, quantity, item_price, order_id')
          .in('order_id', validIds);
        const tally = {};
        for (const r of itemRows || []) {
          tally[r.item_name] = tally[r.item_name] || { qty: 0, revenue: 0 };
          tally[r.item_name].qty += r.quantity;
          tally[r.item_name].revenue += Number(r.item_price) * r.quantity;
        }
        bestsellers = Object.entries(tally)
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);
      }
    }

    const days = [...Array(7)].map((_, i) => {
      const day = new Date(todayStart.getTime() - (6 - i) * DAY_MS);
      const next = new Date(day.getTime() + DAY_MS);
      const revenue = weekOrders
        .filter(
          (o) =>
            o.status !== 'cancelled' &&
            new Date(o.created_at) >= day &&
            new Date(o.created_at) < next
        )
        .reduce((s, o) => s + Number(o.total), 0);
      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue,
        isToday: i === 6,
      };
    });

    setData({
      todayOrders,
      menuItems: itemsRes.count || 0,
      tables: tablesRes.count || 0,
      everOrdered: (anyOrderRes.count || 0) > 0,
      bestsellers,
      days,
    });
  }, [supabase, restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return <p className="text-gray-500">Loading overview…</p>;
  }

  const active = data.todayOrders.filter((o) =>
    ['pending', 'preparing', 'ready'].includes(o.status)
  );
  const served = data.todayOrders.filter((o) => o.status === 'served');
  const cancelled = data.todayOrders.filter((o) => o.status === 'cancelled');
  const revenue = data.todayOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total), 0);
  const collected = served.reduce((s, o) => s + Number(o.total), 0);
  const pendingCollection = revenue - collected;
  const maxDay = Math.max(...data.days.map((d) => d.revenue), 1);

  const setupSteps = [
    {
      done: data.menuItems > 0,
      label: 'Build your menu',
      desc: 'Add categories and items with prices',
      href: '/dashboard/menu',
    },
    {
      done: data.tables > 0,
      label: 'Add your tables & print QR codes',
      desc: 'One QR per table, printed and placed',
      href: '/dashboard/tables',
    },
    {
      done: data.everOrdered,
      label: 'Place a test order',
      desc: 'Scan a table QR with your phone and order',
      href: '/dashboard/tables',
    },
  ];
  const setupDone = setupSteps.every((s) => s.done);

  const cards = [
    { label: "Today's orders", value: data.todayOrders.length, icon: '🧾', tint: 'from-sky-50 to-white' },
    { label: 'Active now', value: active.length, icon: '🔥', tint: 'from-amber-50 to-white' },
    { label: "Today's revenue", value: `${restaurant.currency} ${revenue.toFixed(0)}`, icon: '💰', tint: 'from-emerald-50 to-white' },
    { label: 'Menu items', value: data.menuItems, icon: '📖', tint: 'from-violet-50 to-white' },
    { label: 'Tables', value: data.tables, icon: '🪑', tint: 'from-rose-50 to-white' },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Overview</h1>
        <button className="btn-secondary" onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {!setupDone && (
        <div className="card mt-6 border-brand-200/60 bg-gradient-to-br from-brand-50 to-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">🚀 Finish your setup</h2>
            <span className="text-sm font-semibold text-brand-700">
              {setupSteps.filter((s) => s.done).length}/{setupSteps.length} done
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {setupSteps.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                  s.done
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-card'
                }`}
              >
                <span
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${
                    s.done ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300 text-gray-300'
                  }`}
                >
                  {s.done ? '✓' : ''}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block font-semibold ${
                      s.done ? 'text-emerald-800 line-through decoration-emerald-300' : ''
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="block text-sm text-gray-500">{s.desc}</span>
                </span>
                {!s.done && <span className="ml-auto text-brand-600">→</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className={`card-hover bg-gradient-to-b p-5 ${c.tint}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{c.label}</p>
              <span className="text-lg">{c.icon}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display font-bold">Last 7 days</h2>
          <div className="mt-5 flex h-40 items-end gap-3">
            {data.days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-gray-500">
                  {d.revenue > 0 ? d.revenue.toFixed(0) : ''}
                </span>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    d.isToday
                      ? 'bg-gradient-to-t from-brand-600 to-brand-400'
                      : 'bg-gray-200'
                  }`}
                  style={{
                    height: `${Math.max((d.revenue / maxDay) * 100, d.revenue > 0 ? 6 : 2)}%`,
                  }}
                />
                <span
                  className={`text-xs ${
                    d.isToday ? 'font-bold text-brand-700' : 'text-gray-400'
                  }`}
                >
                  {d.isToday ? 'Today' : d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display font-bold">Bestsellers today</h2>
          {data.bestsellers.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No orders yet today — bestsellers appear as orders come in.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.bestsellers.map((b, i) => (
                <li key={b.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                  <span className="text-sm text-gray-500">{b.qty} sold</span>
                  <span className="w-24 text-right text-sm font-semibold">
                    {restaurant.currency} {b.revenue.toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold">End-of-day reconciliation</h2>
          <p className="text-sm text-gray-500">
            Compare against your cash drawer + wallet receipts before closing.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Collected (served)
            </p>
            <p className="mt-1 font-display text-xl font-bold text-emerald-800">
              {restaurant.currency} {collected.toFixed(0)}
            </p>
            <p className="text-xs text-emerald-600">{served.length} orders</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Still open
            </p>
            <p className="mt-1 font-display text-xl font-bold text-amber-800">
              {restaurant.currency} {pendingCollection.toFixed(0)}
            </p>
            <p className="text-xs text-amber-600">{active.length} active orders</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-red-700">
              Cancelled
            </p>
            <p className="mt-1 font-display text-xl font-bold text-red-800">
              {cancelled.length}
            </p>
            <p className="text-xs text-red-600">not counted in revenue</p>
          </div>
          <div className="rounded-xl bg-gray-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Day total
            </p>
            <p className="mt-1 font-display text-xl font-bold">
              {restaurant.currency} {revenue.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">{data.todayOrders.length} orders</p>
          </div>
        </div>

        {active.length > 0 && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            ⚠️ {active.length} order{active.length > 1 ? 's are' : ' is'} not marked
            Served yet — finish them on the{' '}
            <Link href="/dashboard/orders" className="font-semibold underline">
              kitchen board
            </Link>{' '}
            so your numbers match the drawer.
          </p>
        )}

        {data.todayOrders.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-900">
              Show today&apos;s order list ({data.todayOrders.length})
            </summary>
            <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
              {data.todayOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{o.table_name || 'No table'}</span>
                  <span className="text-gray-400">
                    {new Date(o.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    className={`badge-status ${
                      o.status === 'served'
                        ? 'bg-emerald-100 text-emerald-700'
                        : o.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {o.status}
                  </span>
                  <span className="w-24 text-right font-semibold">
                    {restaurant.currency} {Number(o.total).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
