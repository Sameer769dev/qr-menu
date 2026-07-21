'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMenuTheme } from '@/lib/menu-themes';

/* ---------- shared quantity control ---------- */
function Qty({ T, qty, onAdd, onSub, size = 'md' }) {
  const h = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  if (qty === 0) {
    return (
      <button
        className={`btn ${size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5'} ${T.addBtn}`}
        onClick={onAdd}
      >
        Add
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <button className={`btn ${h} p-0 ${T.qtyMinus}`} onClick={onSub}>
        −
      </button>
      <span className={`w-4 text-center font-bold ${T.qtyText}`}>{qty}</span>
      <button className={`btn ${h} p-0 ${T.addBtn}`} onClick={onAdd}>
        +
      </button>
    </div>
  );
}

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

  // Realtime: theme changes, item edits, and sold-out toggles appear on
  // customers' phones instantly — no refresh needed.
  useEffect(() => {
    if (!restaurant?.id) return;
    const channel = supabase
      .channel(`menu-live-${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${restaurant.id}` },
        load
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `restaurant_id=eq.${restaurant.id}` },
        load
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${restaurant.id}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurant?.id, load]);

  const T = getMenuTheme(restaurant?.menu_theme);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = items.find((i) => i.id === id);
      return item ? { item, qty } : null;
    })
    .filter(Boolean);
  const cartTotal = cartItems.reduce((s, { item, qty }) => s + Number(item.price) * qty, 0);
  const cartCount = cartItems.reduce((s, { qty }) => s + qty, 0);

  function adjust(id, d) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));
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

  const cur = restaurant.currency;

  /* ---------- per-item renderers by layout ---------- */
  function ElegantItem({ item }) {
    const qty = cart[item.id] || 0;
    return (
      <li className="flex items-start gap-4 py-4">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-16 w-16 flex-none rounded-full object-cover ring-1 ring-black/10"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className={`text-lg font-medium ${T.name}`}>{item.name}</h3>
            <span className={`flex-1 border-b border-dotted ${T.leader} translate-y-[-3px]`} />
            <span className={`text-lg ${T.price}`}>
              {cur} {Number(item.price).toFixed(0)}
            </span>
          </div>
          {item.description && (
            <p className={`mt-1 text-sm leading-relaxed ${T.desc}`}>{item.description}</p>
          )}
          <div className="mt-2">
            <Qty
              T={T}
              qty={qty}
              size="sm"
              onAdd={() => adjust(item.id, 1)}
              onSub={() => adjust(item.id, -1)}
            />
          </div>
        </div>
      </li>
    );
  }

  function GalleryItem({ item }) {
    const qty = cart[item.id] || 0;
    return (
      <li
        className={`overflow-hidden rounded-3xl ${
          T.layout === 'gallery' && restaurant.menu_theme === 'noir'
            ? 'bg-white/5 ring-1 ring-white/10'
            : 'bg-white shadow-card ring-1 ring-black/5'
        }`}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="aspect-[16/10] w-full object-cover" />
        ) : (
          <div className={`flex aspect-[16/10] w-full items-center justify-center text-4xl ${T.imgPlaceholder}`}>
            🍽️
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className={`text-lg font-bold leading-tight ${T.name}`}>{item.name}</h3>
            <span className={`whitespace-nowrap text-lg ${T.price}`}>
              {cur} {Number(item.price).toFixed(0)}
            </span>
          </div>
          {item.description && (
            <p className={`mt-1 line-clamp-2 text-sm ${T.desc}`}>{item.description}</p>
          )}
          <div className="mt-3">
            <Qty T={T} qty={qty} onAdd={() => adjust(item.id, 1)} onSub={() => adjust(item.id, -1)} />
          </div>
        </div>
      </li>
    );
  }

  function GridItem({ item }) {
    const qty = cart[item.id] || 0;
    return (
      <li className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="aspect-square w-full object-cover" />
        ) : (
          <div className={`flex aspect-square w-full items-center justify-center text-3xl ${T.imgPlaceholder}`}>
            🍽️
          </div>
        )}
        <div className="p-3">
          <h3 className={`text-sm font-semibold leading-tight ${T.name}`}>{item.name}</h3>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-sm ${T.price}`}>
              {cur} {Number(item.price).toFixed(0)}
            </span>
            <Qty T={T} qty={qty} size="sm" onAdd={() => adjust(item.id, 1)} onSub={() => adjust(item.id, -1)} />
          </div>
        </div>
      </li>
    );
  }

  function ListItem({ item }) {
    const qty = cart[item.id] || 0;
    return (
      <li className={`flex items-center gap-3.5 rounded-xl p-3 ${T.surface}`}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-14 w-14 flex-none rounded-full object-cover"
          />
        ) : (
          <div className={`flex h-14 w-14 flex-none items-center justify-center rounded-full text-xl ${T.imgPlaceholder}`}>
            🍽️
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold leading-tight ${T.name}`}>{item.name}</h3>
          {item.description && (
            <p className={`mt-0.5 line-clamp-2 text-xs ${T.desc}`}>{item.description}</p>
          )}
          <p className={`mt-1 text-sm ${T.price}`}>
            {cur} {Number(item.price).toFixed(0)}
          </p>
        </div>
        <div className="flex-none">
          <Qty T={T} qty={qty} size="sm" onAdd={() => adjust(item.id, 1)} onSub={() => adjust(item.id, -1)} />
        </div>
      </li>
    );
  }

  function MasonryItem({ item }) {
    const qty = cart[item.id] || 0;
    return (
      <li className={`mb-3 break-inside-avoid overflow-hidden rounded-3xl ${T.surface}`}>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="w-full object-cover" />
        )}
        <div className="p-3.5">
          <h3 className={`leading-tight ${T.name}`}>{item.name}</h3>
          {item.description && (
            <p className={`mt-1 line-clamp-3 text-xs leading-relaxed ${T.desc}`}>
              {item.description}
            </p>
          )}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className={`text-sm ${T.price}`}>
              {cur} {Number(item.price).toFixed(0)}
            </span>
            <Qty T={T} qty={qty} size="sm" onAdd={() => adjust(item.id, 1)} onSub={() => adjust(item.id, -1)} />
          </div>
        </div>
      </li>
    );
  }

  function renderCategory(cat) {
    const catItems = items.filter((i) => i.category_id === cat.id);
    if (catItems.length === 0) return null;

    const heading = (
      <div className="flex items-center gap-3 pb-1 pt-8">
        <span className={`h-px flex-1 ${T.catRule}`} />
        <h2 className={`text-center text-xl font-bold uppercase tracking-[0.18em] ${T.catTitle}`}>
          {cat.name}
        </h2>
        <span className={`h-px flex-1 ${T.catRule}`} />
      </div>
    );

    if (T.layout === 'grid') {
      return (
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
          {heading}
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {catItems.map((item) => (
              <GridItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      );
    }

    if (T.layout === 'list') {
      return (
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
          {heading}
          <ul className="mt-4 space-y-2.5">
            {catItems.map((item) => (
              <ListItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      );
    }

    if (T.layout === 'masonry') {
      return (
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
          {heading}
          <ul className="mt-4 columns-2 gap-3">
            {catItems.map((item) => (
              <MasonryItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      );
    }

    if (T.layout === 'gallery') {
      return (
        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
          {heading}
          <ul className="mt-4 space-y-5">
            {catItems.map((item) => (
              <GalleryItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      );
    }

    // elegant
    return (
      <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
        {heading}
        <ul className="mt-2 divide-y divide-black/5">
          {catItems.map((item) => (
            <ElegantItem key={item.id} item={item} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className={`min-h-screen ${T.page}`}>
      <main className="mx-auto max-w-lg pb-28">
        {/* ---- HERO ---- */}
        <header className={`relative overflow-hidden px-6 pb-9 pt-11 text-center ${T.hero}`}>
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
          <p className={`text-xs uppercase tracking-[0.35em] ${T.heroSub}`}>
            {table ? table.name : 'Menu'}
          </p>
          <h1 className={`relative mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${T.heroName}`}>
            {restaurant.name}
          </h1>
          <span className={`mx-auto mt-4 block h-px w-16 ${T.heroRule}`} />
          {restaurant.address && (
            <p className={`mt-3 text-sm ${T.heroSub}`}>📍 {restaurant.address}</p>
          )}
        </header>

        {/* ---- CATEGORY NAV ---- */}
        {categories.length > 0 && (
          <nav
            className={`sticky top-0 z-10 flex gap-2 overflow-x-auto border-b px-4 py-2.5 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${T.nav}`}
          >
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium shadow-sm transition-all active:scale-95 ${T.pill}`}
              >
                {cat.name}
              </a>
            ))}
          </nav>
        )}

        {/* ---- MENU BODY ---- */}
        <div className="px-5">
          {categories.map(renderCategory)}
          {items.length === 0 && (
            <p className={`py-16 text-center ${T.desc}`}>
              The menu is being set up. Please check back soon!
            </p>
          )}
        </div>

        {/* ---- CART BAR ---- */}
        {cartCount > 0 && !cartOpen && (
          <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg p-4">
            <button
              className={`btn w-full animate-slide-up py-3.5 text-base ${T.cartBar}`}
              onClick={() => setCartOpen(true)}
            >
              View order · {cartCount} item{cartCount > 1 ? 's' : ''} · {cur} {cartTotal.toFixed(0)}
            </button>
          </div>
        )}

        {/* ---- CART SHEET ---- */}
        {cartOpen && (
          <div
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setCartOpen(false)}
          >
            <div
              className={`max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl p-5 pb-6 shadow-deep ${T.sheet}`}
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-current opacity-20" />
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-bold ${T.sheetName}`}>Your order</h2>
                <button
                  className={`text-2xl ${T.sheetMuted}`}
                  onClick={() => setCartOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <ul className={`mt-3 divide-y ${T.sheetBorder}`}>
                {cartItems.map(({ item, qty }) => (
                  <li key={item.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 pr-2">
                      <p className={`font-medium ${T.sheetName}`}>{item.name}</p>
                      <p className={`text-sm ${T.sheetMuted}`}>
                        {cur} {Number(item.price).toFixed(0)} each
                      </p>
                    </div>
                    <Qty T={T} qty={qty} onAdd={() => adjust(item.id, 1)} onSub={() => adjust(item.id, -1)} />
                  </li>
                ))}
              </ul>

              <div className={`mt-2 flex justify-between border-t pt-3 text-lg font-bold ${T.sheetBorder}`}>
                <span className={T.sheetName}>Total</span>
                <span className={T.price}>
                  {cur} {cartTotal.toFixed(0)}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  className={T.input}
                  placeholder="Your name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <textarea
                  className={T.input}
                  rows={2}
                  placeholder="Note for the kitchen (optional) — e.g. less spicy"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

              <button
                className={`btn mt-4 w-full py-3 text-base ${T.cartBar}`}
                disabled={placing || cartCount === 0}
                onClick={placeOrder}
              >
                {placing ? 'Placing order…' : `Place order · ${cur} ${cartTotal.toFixed(0)}`}
              </button>
              <p className={`mt-2 text-center text-xs ${T.sheetMuted}`}>
                Pay at the counter or when your food arrives.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
