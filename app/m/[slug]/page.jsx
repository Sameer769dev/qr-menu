'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CustomerMenuPage() {
  const supabase = useMemo(() => createClient(), []);
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableId = searchParams.get('t');

  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (!rest) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setRestaurant(rest);

    const [catRes, itemRes, tableRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', rest.id)
        .order('sort_order')
        .order('created_at'),
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', rest.id)
        .order('sort_order')
        .order('created_at'),
      tableId
        ? supabase.from('tables').select('*').eq('id', tableId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setCategories(catRes.data || []);
    setItems((itemRes.data || []).filter((i) => i.is_available));
    setTable(tableRes.data);
    setLoading(false);
  }, [supabase, slug, tableId]);

  useEffect(() => {
    load();
  }, [load]);

  const cartEntries = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartItems = cartEntries
    .map(([id, qty]) => {
      const item = items.find((i) => i.id === id);
      return item ? { item, qty } : null;
    })
    .filter(Boolean);
  const cartTotal = cartItems.reduce(
    (sum, { item, qty }) => sum + Number(item.price) * qty,
    0
  );
  const cartCount = cartItems.reduce((sum, { qty }) => sum + qty, 0);

  function adjust(itemId, delta) {
    setCart((c) => {
      const qty = Math.max(0, (c[itemId] || 0) + delta);
      return { ...c, [itemId]: qty };
    });
  }

  async function placeOrder() {
    setError('');
    setPlacing(true);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurant.id,
        table_id: table?.id || null,
        table_name: table?.name || null,
        customer_name: customerName.trim() || null,
        note: note.trim() || null,
        status: 'pending',
        total: cartTotal,
      })
      .select()
      .single();

    if (orderErr || !order) {
      setError('Could not place the order. Please try again.');
      setPlacing(false);
      return;
    }

    const { error: itemsErr } = await supabase.from('order_items').insert(
      cartItems.map(({ item, qty }) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_name: item.name,
        item_price: item.price,
        quantity: qty,
      }))
    );

    if (itemsErr) {
      setError('Could not place the order. Please try again.');
      setPlacing(false);
      return;
    }

    router.push(`/m/${slug}/order/${order.id}`);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-500">
        Loading menu…
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <div className="text-4xl">😕</div>
          <h1 className="mt-2 text-xl font-bold">Menu not found</h1>
          <p className="mt-1 text-gray-600">
            This menu doesn&apos;t exist or is temporarily offline.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg pb-28">
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-4 pb-7 pt-8 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 -left-6 h-32 w-32 rounded-full bg-black/10 blur-xl" />
        <h1 className="relative font-display text-2xl font-bold tracking-tight">
          {restaurant.name}
        </h1>
        <div className="relative mt-1.5 flex flex-wrap gap-x-4 text-sm text-white/80">
          {table && <span>🪑 {table.name}</span>}
          {restaurant.address && <span>📍 {restaurant.address}</span>}
        </div>
      </header>

      {categories.length > 0 && (
        <nav className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-gray-200/70 bg-white/85 px-4 py-2.5 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all active:scale-95 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {cat.name}
            </a>
          ))}
        </nav>
      )}

      <div className="px-4">
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16 pt-7">
              <h2 className="font-display text-lg font-bold tracking-tight">{cat.name}</h2>
              <ul className="mt-3 space-y-3">
                {catItems.map((item) => {
                  const qty = cart[item.id] || 0;
                  return (
                    <li
                      key={item.id}
                      className={`card flex gap-3 p-3 transition-all duration-200 ${
                        qty > 0 ? 'ring-2 ring-brand-500/30 border-brand-200' : ''
                      }`}
                    >
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="font-semibold">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <span className="font-bold">
                            {restaurant.currency} {Number(item.price).toFixed(0)}
                          </span>
                          {qty === 0 ? (
                            <button className="btn-primary px-4 py-1" onClick={() => adjust(item.id, 1)}>
                              Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                className="btn-secondary h-8 w-8 p-0"
                                onClick={() => adjust(item.id, -1)}
                              >
                                −
                              </button>
                              <span className="w-4 text-center font-bold">{qty}</span>
                              <button
                                className="btn-primary h-8 w-8 p-0"
                                onClick={() => adjust(item.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {items.length === 0 && (
          <p className="py-16 text-center text-gray-500">
            The menu is being set up. Please check back soon!
          </p>
        )}
      </div>

      {cartCount > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg p-4">
          <button
            className="btn-primary w-full animate-slide-up py-3.5 text-base shadow-glow"
            onClick={() => setCartOpen(true)}
          >
            View order · {cartCount} item{cartCount > 1 ? 's' : ''} ·{' '}
            {restaurant.currency} {cartTotal.toFixed(0)}
          </button>
        </div>
      )}

      {cartOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setCartOpen(false)}
        >
          <div className="max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-6 shadow-deep">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200" />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Your order</h2>
              <button
                className="text-2xl text-gray-400"
                onClick={() => setCartOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <ul className="mt-3 divide-y divide-gray-100">
              {cartItems.map(({ item, qty }) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {restaurant.currency} {Number(item.price).toFixed(0)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="btn-secondary h-8 w-8 p-0" onClick={() => adjust(item.id, -1)}>
                      −
                    </button>
                    <span className="w-4 text-center font-bold">{qty}</span>
                    <button className="btn-primary h-8 w-8 p-0" onClick={() => adjust(item.id, 1)}>
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex justify-between border-t border-gray-200 pt-3 font-bold">
              <span>Total</span>
              <span>
                {restaurant.currency} {cartTotal.toFixed(0)}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <input
                className="input"
                placeholder="Your name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <textarea
                className="input"
                rows={2}
                placeholder="Note for the kitchen (optional) — e.g. less spicy"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <button
              className="btn-primary mt-4 w-full py-3 text-base"
              disabled={placing || cartCount === 0}
              onClick={placeOrder}
            >
              {placing
                ? 'Placing order…'
                : `Place order · ${restaurant.currency} ${cartTotal.toFixed(0)}`}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Pay at the counter or when your food arrives.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
