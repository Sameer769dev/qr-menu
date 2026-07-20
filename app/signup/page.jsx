'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setNeedsConfirm(true);
      setLoading(false);
      return;
    }

    const base = slugify(restaurantName);
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: restError } = await supabase.from('restaurants').insert({
      owner_id: authData.user.id,
      name: restaurantName,
      slug,
    });
    if (restError) {
      setError(restError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (needsConfirm) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4">
        <div className="bg-grid-dark absolute inset-0" />
        <div className="absolute left-1/2 top-[-200px] h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[130px]" />
        <div className="glass relative w-full max-w-md p-10 text-center animate-scale-in">
          <div className="text-5xl">📧</div>
          <h1 className="mt-4 font-display text-xl font-bold text-white">
            Confirm your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it, then log in — we&apos;ll finish setting up your restaurant.
          </p>
          <Link href="/login" className="btn-primary mt-8 w-full py-3">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      <div className="bg-grid-dark absolute inset-0" />
      <div className="absolute left-1/2 top-[-200px] h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[130px]" />

      <div className="glass relative w-full max-w-md p-8 animate-scale-in sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg shadow-glow-sm">
            🍽️
          </span>
          <span className="font-display text-lg font-bold text-white">QR Menu</span>
        </Link>

        <h1 className="mt-6 font-display text-2xl font-bold text-white">
          Create your restaurant
        </h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Free to set up. Your menu can be live in 10 minutes.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label-dark" htmlFor="rname">
              Restaurant / cafe name
            </label>
            <input
              id="rname"
              type="text"
              required
              placeholder="e.g. Himalayan Java, Thamel"
              className="input-dark"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
            />
          </div>
          <div>
            <label className="label-dark" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input-dark"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label-dark" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="input-dark"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-300">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-brand-400 transition hover:text-brand-300"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
