'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RestaurantContext } from '@/lib/restaurant-context';
import { getStaffMode, setStaffMode, onStaffModeChange } from '@/lib/staff-mode';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/orders', label: 'Orders', icon: '🔔' },
  { href: '/dashboard/menu', label: 'Menu', icon: '📖' },
  { href: '/dashboard/tables', label: 'Tables & QR', icon: '🪑' },
  { href: '/dashboard/staff', label: 'Staff', icon: '🧑‍🍳' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'restaurant'
  );
}

function CreateRestaurantForm({ onCreated }) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: err } = await supabase
      .from('restaurants')
      .insert({ owner_id: user.id, name, slug });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    onCreated();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4">
      <div className="bg-grid-dark absolute inset-0" />
      <div className="absolute left-1/2 top-[-200px] h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[130px]" />
      <div className="glass relative w-full max-w-md p-8 animate-scale-in sm:p-10">
        <h1 className="font-display text-2xl font-bold text-white">One last step</h1>
        <p className="mt-1.5 text-sm text-ink-300">Name your restaurant to finish setup.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label-dark" htmlFor="rname">Restaurant / cafe name</label>
            <input
              id="rname"
              className="input-dark"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating…' : 'Create restaurant'}
          </button>
        </form>
      </div>
    </main>
  );
}

function ExitStaffModal({ restaurant, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (pin === restaurant.manager_pin) {
      setStaffMode(null);
      onClose();
    } else {
      setError('Wrong manager PIN.');
      setPin('');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card w-full max-w-xs animate-scale-in p-6 text-center">
        <div className="text-3xl">🔒</div>
        <h2 className="mt-2 font-display text-lg font-bold">Exit staff mode</h2>
        <p className="mt-1 text-sm text-gray-500">Enter the manager PIN.</p>
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            autoFocus
            className="input w-36 text-center font-mono text-2xl tracking-[0.4em]"
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
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [staffMode, setStaffModeState] = useState(null);
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    setStaffModeState(getStaffMode());
    return onStaffModeChange(() => setStaffModeState(getStaffMode()));
  }, []);

  useEffect(() => {
    if (staffMode && pathname !== '/dashboard/orders') {
      router.replace('/dashboard/orders');
    }
  }, [staffMode, pathname, router]);

  const loadRestaurant = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    setRestaurant(data);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
          Loading…
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <CreateRestaurantForm
        onCreated={() => {
          setLoading(true);
          loadRestaurant();
        }}
      />
    );
  }

  return (
    <RestaurantContext.Provider value={{ restaurant, refreshRestaurant: loadRestaurant }}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/60">
        <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-base shadow-glow-sm">
                🍽️
              </span>
              <span className="truncate font-display font-bold">{restaurant.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {staffMode ? (
                <>
                  <span className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 sm:inline-flex">
                    🔒 {staffMode.name} on shift
                  </span>
                  <button onClick={() => setShowExit(true)} className="btn-secondary">
                    Exit staff mode
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={`/m/${restaurant.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary hidden sm:inline-flex"
                  >
                    View public menu ↗
                  </a>
                  <button onClick={handleSignOut} className="btn-secondary">
                    Sign out
                  </button>
                  <button
                    className="btn-secondary px-3 sm:hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle navigation"
                  >
                    ☰
                  </button>
                </>
              )}
            </div>
          </div>
          <nav
            className={`${menuOpen ? 'block' : 'hidden'} ${staffMode ? '!hidden' : ''} border-t border-gray-100 sm:block`}
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-1.5 sm:flex-row">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`relative rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.15)]'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.icon} {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
      {showExit && (
        <ExitStaffModal restaurant={restaurant} onClose={() => setShowExit(false)} />
      )}
    </RestaurantContext.Provider>
  );
}
