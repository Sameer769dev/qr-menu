'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  { key: 'pending', label: 'Order received', icon: '📨' },
  { key: 'preparing', label: 'Being prepared', icon: '👨‍🍳' },
  { key: 'ready', label: 'Ready!', icon: '🔔' },
  { key: 'served', label: 'Served', icon: '✅' },
];

export default function OrderStatusPage() {
  const supabase = useMemo(() => createClient(), []);
  const { slug, orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: o } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (!o) {
      setLoading(false);
      return;
    }
    setOrder(o);

    const [itemRes, restRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', orderId),
      supabase.from('restaurants').select('*').eq('id', o.restaurant_id).maybeSingle(),
    ]);
    setItems(itemRes.data || []);
    setRestaurant(restRes.data);
    setLoading(false);
  }, [supabase, orderId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => setOrder(payload.new)
      )
      .subscribe();

    const interval = setInterval(load, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, orderId, load]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-500">
        Loading…
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <div className="text-4xl">😕</div>
          <h1 className="mt-2 text-xl font-bold">Order not found</h1>
          <Link href={`/m/${slug}`} className="btn-primary mt-4">
            Back to menu
          </Link>
        </div>
      </main>
    );
  }

  const currency = restaurant?.currency || 'Rs.';
  const currentStep = STEPS.findIndex((s) => s.key === order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="card animate-scale-in p-6 text-center">
        {cancelled ? (
          <>
            <div className="text-5xl">❌</div>
            <h1 className="mt-3 text-xl font-bold">Order cancelled</h1>
            <p className="mt-1 text-sm text-gray-600">
              Please ask the staff if this seems wrong.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl">{STEPS[Math.max(currentStep, 0)]?.icon}</div>
            <h1 className="mt-3 font-display text-xl font-bold tracking-tight">
              {STEPS[Math.max(currentStep, 0)]?.label}
            </h1>
            {order.table_name && (
              <p className="mt-1 text-sm text-gray-600">
                {order.table_name}
                {restaurant ? ` · ${restaurant.name}` : ''}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
                        i <= currentStep
                          ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow-sm'
                          : 'bg-gray-200 text-gray-400'
                      } ${i === currentStep ? 'animate-pulse-glow' : ''}`}
                    >
                      {i < currentStep ? '✓' : i + 1}
                    </div>
                    <span className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`mx-1 h-1 flex-1 rounded ${
                        i < currentStep ? 'bg-brand-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card mt-4 p-5">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between py-2">
              <span>
                <span className="font-semibold">{it.quantity}×</span> {it.item_name}
              </span>
              <span>
                {currency} {(Number(it.item_price) * it.quantity).toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 font-bold">
          <span>Total</span>
          <span>
            {currency} {Number(order.total).toFixed(0)}
          </span>
        </div>
        {order.note && (
          <p className="mt-3 text-sm italic text-gray-600">📝 {order.note}</p>
        )}
      </div>

      <Link href={`/m/${slug}`} className="btn-secondary mt-4 w-full">
        ← Order something else
      </Link>
      <p className="mt-3 text-center text-xs text-gray-500">
        This page updates automatically.
      </p>
    </main>
  );
}
