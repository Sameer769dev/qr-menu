'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';
import { getStaffMode, setStaffMode, onStaffModeChange } from '@/lib/staff-mode';

const STATUS_FLOW = {
  pending: { next: 'preparing', label: 'Start preparing', color: 'bg-amber-50 border-amber-300', badge: 'bg-amber-100 text-amber-800' },
  preparing: { next: 'ready', label: 'Mark ready', color: 'bg-blue-50 border-blue-300', badge: 'bg-blue-100 text-blue-800' },
  ready: { next: 'served', label: 'Mark served', color: 'bg-green-50 border-green-300', badge: 'bg-green-100 text-green-800' },
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio not available — ignore.
  }
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function StaffLoginModal({ staff, onClose }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (pin === selected.pin) {
      setStaffMode({ id: selected.id, name: selected.name, role: selected.role });
      onClose();
    } else {
      setError('Wrong PIN.');
      setPin('');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card w-full max-w-sm animate-scale-in p-6">
        {!selected ? (
          <>
            <h2 className="font-display text-lg font-bold">Who&apos;s on shift?</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {staff.map((m) => (
                <button
                  key={m.id}
                  className="btn-secondary justify-start py-3"
                  onClick={() => setSelected(m)}
                >
                  {m.role === 'kitchen' ? '👨‍🍳' : m.role === 'manager' ? '⭐' : '🧑‍💼'}{' '}
                  {m.name}
                </button>
              ))}
            </div>
            <button className="btn-secondary mt-4 w-full" onClick={onClose}>
              Cancel
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="text-center">
            <h2 className="font-display text-lg font-bold">Hi {selected.name} 👋</h2>
            <p className="mt-1 text-sm text-gray-500">Enter your 4-digit PIN.</p>
            <input
              autoFocus
              className="input mt-4 w-36 text-center font-mono text-2xl tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setError('');
                setPin(e.target.value.replace(/\D/g, ''));
              }}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  setSelected(null);
                  setPin('');
                  setError('');
                }}
              >
                Back
              </button>
              <button type="submit" className="btn-primary flex-1">
                Start shift
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function NewOrderModal({ restaurant, staffName, onClose, onPlaced }) {
  const supabase = createClient();
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [tableId, setTableId] = useState('');
  const [qty, setQty] = useState({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tRes, cRes, iRes] = await Promise.all([
        supabase.from('tables').select('*').eq('restaurant_id', restaurant.id).order('created_at'),
        supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).eq('is_available', true).order('sort_order'),
      ]);
      setTables(tRes.data || []);
      setCategories(cRes.data || []);
      setItems(iRes.data || []);
      setLoading(false);
    }
    load();
  }, [supabase, restaurant.id]);

  const chosen = items
    .map((i) => ({ item: i, n: qty[i.id] || 0 }))
    .filter((x) => x.n > 0);
  const total = chosen.reduce((s, x) => s + Number(x.item.price) * x.n, 0);

  function adjust(id, d) {
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));
  }

  async function place() {
    if (chosen.length === 0) return;
    setError('');
    setPlacing(true);
    const table = tables.find((t) => t.id === tableId);
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurant.id,
        table_id: table?.id || null,
        table_name: table?.name || 'Walk-in',
        customer_name: null,
        note: note.trim() ? `${note.trim()} (taken by ${staffName})` : `Taken by ${staffName}`,
        status: 'pending',
        total,
        handled_by: staffName,
      })
      .select()
      .single();
    if (oErr || !order) {
      setError('Could not place the order.');
      setPlacing(false);
      return;
    }
    const { error: iErr } = await supabase.from('order_items').insert(
      chosen.map(({ item, n }) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_name: item.name,
        item_price: item.price,
        quantity: n,
      }))
    );
    if (iErr) {
      setError('Could not save order items.');
      setPlacing(false);
      return;
    }
    onPlaced();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card flex max-h-[88vh] w-full max-w-lg animate-scale-in flex-col p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold">New order (walk-in / phone)</h2>
          <button className="text-2xl text-gray-400" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-gray-500">Loading menu…</p>
          ) : (
            <>
              <label className="label">Table</label>
              <div className="flex flex-wrap gap-2">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTableId(t.id === tableId ? '' : t.id)}
                    className={`btn border px-3 py-1.5 ${
                      tableId === t.id
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
                {tables.length === 0 && (
                  <p className="text-sm text-gray-500">No tables — order will be “Walk-in”.</p>
                )}
              </div>

              <div className="mt-4 space-y-4">
                {categories.map((cat) => {
                  const catItems = items.filter((i) => i.category_id === cat.id);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <p className="text-sm font-bold text-gray-700">{cat.name}</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {catItems.map((item) => {
                          const n = qty[item.id] || 0;
                          return (
                            <li
                              key={item.id}
                              className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                                n > 0 ? 'border-brand-300 bg-brand-50/60' : 'border-gray-100'
                              }`}
                            >
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {item.name}
                                <span className="ml-2 text-xs text-gray-400">
                                  {restaurant.currency} {Number(item.price).toFixed(0)}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <button
                                  className="btn-secondary h-7 w-7 p-0"
                                  onClick={() => adjust(item.id, -1)}
                                >
                                  −
                                </button>
                                <span className="w-4 text-center text-sm font-bold">{n}</span>
                                <button
                                  className="btn-primary h-7 w-7 p-0"
                                  onClick={() => adjust(item.id, 1)}
                                >
                                  +
                                </button>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <textarea
                className="input mt-4"
                rows={2}
                placeholder="Note for the kitchen (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <button
            className="btn-primary w-full py-3"
            disabled={placing || chosen.length === 0}
            onClick={place}
          >
            {placing
              ? 'Placing…'
              : `Place order · ${restaurant.currency} ${total.toFixed(0)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const supabase = createClient();
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState([]);
  const [itemsByOrder, setItemsByOrder] = useState({});
  const [staff, setStaff] = useState([]);
  const [staffMode, setStaffModeState] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showServed, setShowServed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);

  useEffect(() => {
    setStaffModeState(getStaffMode());
    return onStaffModeChange(() => setStaffModeState(getStaffMode()));
  }, []);

  const load = useCallback(async () => {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const [ordersRes, staffRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('staff')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('name'),
    ]);

    const orderData = ordersRes.data || [];
    const orderIds = orderData.map((o) => o.id);
    let itemMap = {};
    if (orderIds.length > 0) {
      const { data: itemData } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);
      for (const it of itemData || []) {
        (itemMap[it.order_id] = itemMap[it.order_id] || []).push(it);
      }
    }
    setOrders(orderData);
    setItemsByOrder(itemMap);
    setStaff(staffRes.data || []);
    setLoading(false);
  }, [supabase, restaurant.id]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`orders-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') playBeep();
          load();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      load();
      forceTick((t) => t + 1);
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, restaurant.id, load]);

  async function setStatus(order, status) {
    await supabase
      .from('orders')
      .update({ status, handled_by: staffMode?.name || 'Owner' })
      .eq('id', order.id);
    load();
  }

  const active = orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status));
  const finished = orders.filter((o) => ['served', 'cancelled'].includes(o.status));

  if (loading) return <p className="text-gray-500">Loading orders…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Kitchen board
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live — new orders appear automatically with a sound.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setShowComposer(true)}>
            ＋ New order
          </button>
          {!staffMode && staff.length > 0 && (
            restaurant.manager_pin ? (
              <button className="btn-secondary" onClick={() => setShowLogin(true)}>
                🔒 Enter staff mode
              </button>
            ) : (
              <Link href="/dashboard/staff" className="btn-secondary">
                Set manager PIN to use staff mode
              </Link>
            )
          )}
          <button className="btn-secondary" onClick={() => setShowServed(!showServed)}>
            {showServed ? 'Hide' : 'Show'} completed ({finished.length})
          </button>
        </div>
      </div>

      {active.length === 0 && (
        <div className="card mt-8 p-10 text-center text-gray-500">
          <div className="text-4xl">🧘</div>
          <p className="mt-2">No active orders. They&apos;ll appear here the moment a customer places one.</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((order) => {
          const flow = STATUS_FLOW[order.status];
          return (
            <div
              key={order.id}
              className={`animate-scale-in rounded-2xl border-2 p-4 shadow-card transition-shadow hover:shadow-card-hover ${flow.color}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{order.table_name || 'No table'}</h3>
                  {order.customer_name && (
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${flow.badge}`}
                  >
                    {order.status}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">{timeAgo(order.created_at)}</p>
                </div>
              </div>

              <ul className="mt-3 space-y-1 border-t border-black/5 pt-3 text-sm">
                {(itemsByOrder[order.id] || []).map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>
                      <span className="font-semibold">{it.quantity}×</span> {it.item_name}
                    </span>
                    <span className="text-gray-500">
                      {restaurant.currency} {(Number(it.item_price) * it.quantity).toFixed(0)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.note && (
                <p className="mt-2 rounded bg-white/70 px-2 py-1 text-sm italic text-gray-700">
                  📝 {order.note}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
                <span className="font-bold">
                  {restaurant.currency} {Number(order.total).toFixed(0)}
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn-danger px-2 py-1 text-xs"
                    onClick={() => setStatus(order, 'cancelled')}
                  >
                    Cancel
                  </button>
                  <button className="btn-primary px-3 py-1" onClick={() => setStatus(order, flow.next)}>
                    {flow.label}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showServed && finished.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-gray-700">Completed (last 24h)</h2>
          <div className="card mt-3 divide-y divide-gray-100">
            {finished.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{order.table_name || 'No table'}</span>{' '}
                  <span className="text-gray-500">
                    · {(itemsByOrder[order.id] || [])
                      .map((i) => `${i.quantity}× ${i.item_name}`)
                      .join(', ')}
                  </span>
                </div>
                <div className="flex flex-none items-center gap-3">
                  {order.handled_by && (
                    <span className="hidden text-xs text-gray-400 sm:inline">
                      by {order.handled_by}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      order.status === 'served'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="font-semibold">
                    {restaurant.currency} {Number(order.total).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLogin && (
        <StaffLoginModal staff={staff} onClose={() => setShowLogin(false)} />
      )}
      {showComposer && (
        <NewOrderModal
          restaurant={restaurant}
          staffName={staffMode?.name || 'Owner'}
          onClose={() => setShowComposer(false)}
          onPlaced={() => {
            setShowComposer(false);
            load();
          }}
        />
      )}
    </div>
  );
}
