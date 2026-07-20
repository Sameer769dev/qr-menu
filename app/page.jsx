'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function PhoneMockup() {
  const wrapRef = useRef(null);
  const [tilt, setTilt] = useState({ x: -8, y: 14 });

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 16, y: px * 22 });
  }

  return (
    <div
      ref={wrapRef}
      className="perspective-1200 relative mx-auto w-full max-w-[420px]"
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: -8, y: 14 })}
    >
      <div className="absolute inset-x-8 top-12 bottom-4 rounded-full bg-brand-600/25 blur-[80px]" />

      <div
        className="preserve-3d relative transition-transform duration-300 ease-out"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="relative mx-auto w-[270px] rounded-[2.6rem] border border-white/15 bg-ink-800 p-2.5 shadow-deep">
          <div className="overflow-hidden rounded-[2.1rem] bg-white">
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-4 pb-4 pt-5 text-white">
              <p className="text-[10px] uppercase tracking-widest text-white/70">Table 4</p>
              <p className="font-display text-lg font-bold leading-tight">Everest Kitchen</p>
            </div>
            <div className="flex gap-1.5 px-3 pt-3">
              {['Momo', 'Chowmein', 'Drinks'].map((c, i) => (
                <span
                  key={c}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    i === 0 ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="space-y-2 p-3">
              {[
                { n: 'Chicken Momo', p: 'Rs. 220', e: '🥟' },
                { n: 'Veg Chowmein', p: 'Rs. 160', e: '🍜' },
                { n: 'Masala Tea', p: 'Rs. 60', e: '☕' },
              ].map((it) => (
                <div
                  key={it.n}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-lg">
                      {it.e}
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-800">{it.n}</p>
                      <p className="text-[10px] text-gray-400">{it.p}</p>
                    </div>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
                    +
                  </span>
                </div>
              ))}
              <div className="rounded-xl bg-ink-900 p-2.5 text-center text-[11px] font-bold text-white">
                Place order · Rs. 440
              </div>
            </div>
          </div>
        </div>

        <div
          className="glass absolute -left-4 top-16 w-44 p-3 animate-float sm:-left-14"
          style={{ transform: 'translateZ(70px)' }}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-base">
              🔔
            </span>
            <div>
              <p className="text-[11px] font-bold text-white">New order — Table 4</p>
              <p className="text-[10px] text-ink-300">2× Momo · 1× Tea</p>
            </div>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
          </div>
        </div>

        <div
          className="glass absolute -right-2 bottom-24 w-40 p-3 animate-float-slow sm:-right-12"
          style={{ transform: 'translateZ(50px)' }}
        >
          <p className="text-[10px] uppercase tracking-widest text-ink-300">Today</p>
          <p className="font-display text-lg font-bold text-white">Rs. 18,540</p>
          <p className="text-[10px] font-medium text-emerald-400">▲ 23% vs yesterday</p>
        </div>

        <div
          className="glass absolute -top-5 right-6 flex items-center gap-2 px-3 py-2 animate-float sm:right-0"
          style={{ transform: 'translateZ(90px)', animationDelay: '1.2s' }}
        >
          <span className="text-base">▦</span>
          <p className="text-[10px] font-semibold text-white">Scan → order</p>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: '📱', title: 'Zero-friction ordering', desc: 'Guests scan the table QR and order from their phone browser in two taps. No app to download, nothing to install.' },
  { icon: '⚡', title: 'Live kitchen board', desc: 'Orders land on your kitchen screen in real time with a sound alert. Tap to move them from pending to served.' },
  { icon: '▦', title: 'QR codes per table', desc: 'Every table gets its own printable QR. Orders arrive already labeled — no more shouting table numbers.' },
  { icon: '📝', title: 'Menu you control', desc: 'Change prices, add photos, or mark items sold out from your phone. Your menu updates everywhere, instantly.' },
  { icon: '📊', title: 'Daily insights', desc: "See today's orders, revenue, and your bestsellers at a glance — know what to cook more of." },
  { icon: '💸', title: 'Flat, honest pricing', desc: 'No commissions taken from your orders. No expensive POS hardware. One flat monthly price.' },
];

const STEPS = [
  { n: '01', title: 'Build your menu', desc: 'Add categories, dishes, prices, and photos in minutes — right from your phone or laptop.' },
  { n: '02', title: 'Print your QR codes', desc: 'Each table gets a unique QR code. Download, print, and place them on your tables.' },
  { n: '03', title: 'Serve orders live', desc: 'Guests scan and order. The kitchen sees everything instantly on any iPad or laptop.' },
];

export default function Home() {
  useReveal();

  return (
    <main className="bg-ink-950 text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg shadow-glow-sm">
              🍽️
            </span>
            <span className="font-display text-lg font-bold tracking-tight">QR Menu</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink-300 md:flex">
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className="btn-ghost-dark">Log in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="bg-grid-dark absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[140px]" />
        <div className="absolute right-[-200px] top-40 h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[120px]" />
        <div className="bg-noise absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="badge-dark animate-fade-up">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live in Kathmandu · Pokhara · Chitwan
              </div>

              <h1
                className="animate-fade-up mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
                style={{ animationDelay: '0.1s' }}
              >
                Your menu,
                <br />
                on every table.
                <br />
                <span className="text-gradient">No app. No hardware.</span>
              </h1>

              <p
                className="animate-fade-up mt-6 max-w-md text-lg leading-relaxed text-ink-300"
                style={{ animationDelay: '0.2s' }}
              >
                Guests scan, browse, and order from their phone. Orders appear
                live in your kitchen. Replace clunky POS systems with one
                simple web platform.
              </p>

              <div
                className="animate-fade-up mt-9 flex flex-wrap items-center gap-4"
                style={{ animationDelay: '0.3s' }}
              >
                <Link href="/signup" className="btn-primary animate-pulse-glow px-7 py-3.5 text-base">
                  Start free — 10 min setup
                </Link>
                <a href="#how" className="btn-ghost-dark px-6 py-3.5 text-base">
                  See how it works ↓
                </a>
              </div>

              <div
                className="animate-fade-up mt-10 flex items-center gap-6 text-sm text-ink-400"
                style={{ animationDelay: '0.4s' }}
              >
                <span>✓ No commissions</span>
                <span>✓ No downloads</span>
                <span>✓ Cancel anytime</span>
              </div>
            </div>

            <div className="pb-10">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-ink-900/60 py-5">
        <div className="mask-fade-x overflow-hidden">
          <div className="flex w-max animate-ticker gap-12 whitespace-nowrap text-sm text-ink-400">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-12">
                <span>🥟 Momo shops</span>
                <span>☕ Coffee houses</span>
                <span>🍛 Thakali kitchens</span>
                <span>🍕 Pizzerias</span>
                <span>🍺 Bars &amp; pubs</span>
                <span>🧁 Bakeries</span>
                <span>🍜 Noodle bars</span>
                <span>🏔️ Trekking lodges</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Live in three steps
            </h2>
            <p className="mt-4 text-lg text-ink-300">
              From signup to your first order in about ten minutes.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`glass-hover reveal reveal-delay-${i + 1} relative p-8`}>
                <span className="font-display text-5xl font-extrabold text-white/5">{s.n}</span>
                <span className="absolute right-8 top-8 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/30 to-brand-700/30 text-lg">
                  {i === 0 ? '📝' : i === 1 ? '▦' : '🔔'}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
                <p className="mt-2.5 leading-relaxed text-ink-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative py-24 sm:py-32">
        <div className="absolute left-[-200px] top-1/3 h-[400px] w-[400px] rounded-full bg-brand-600/10 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">Features</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Everything your floor needs.
              <br />
              <span className="text-gradient">Nothing you don&apos;t.</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass-hover reveal ${i % 3 === 1 ? 'reveal-delay-1' : i % 3 === 2 ? 'reveal-delay-2' : ''} p-7`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-brand-700/25 text-2xl">
                  {f.icon}
                </span>
                <h3 className="mt-5 font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">Pricing</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              One flat price. That&apos;s it.
            </h2>
            <p className="mt-4 text-lg text-ink-300">
              Less than the cost of two plates of momo per day.
            </p>
          </div>

          <div className="reveal relative mx-auto mt-14 max-w-md">
            <div className="absolute -inset-px rounded-[1.6rem] bg-gradient-to-b from-brand-500/60 via-white/10 to-transparent" />
            <div className="relative rounded-[1.55rem] bg-ink-900 p-8 sm:p-10">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-bold">Everything plan</h3>
                <span className="badge-dark border-brand-500/30 text-brand-300">Most popular</span>
              </div>
              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-5xl font-extrabold tracking-tight">Rs. 1,500</span>
                <span className="pb-1.5 text-ink-400">/ month</span>
              </div>
              <ul className="mt-8 space-y-3.5 text-[15px] text-ink-200">
                {[
                  'Unlimited menu items & tables',
                  'Unlimited orders — zero commission',
                  'Live kitchen dashboard',
                  'Printable QR codes for every table',
                  'Daily sales overview',
                  'Works on any phone, tablet, or laptop',
                ].map((li) => (
                  <li key={li} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-500/20 text-[11px] text-brand-400">
                      ✓
                    </span>
                    {li}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary mt-9 w-full py-3.5 text-base">
                Start your free setup
              </Link>
              <p className="mt-3 text-center text-xs text-ink-400">
                First month free · No card required
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-x-0 bottom-[-200px] h-[400px] bg-brand-600/15 blur-[120px]" />
        <div className="reveal relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
            Ready to modernize your floor?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Set up your digital menu tonight. Take your first QR order at
            tomorrow&apos;s lunch rush.
          </p>
          <Link href="/signup" className="btn-primary mt-9 inline-flex px-8 py-4 text-base">
            Create your restaurant — free
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-ink-400 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm">
              🍽️
            </span>
            <span className="font-display font-bold text-white">QR Menu</span>
          </div>
          <p>Digital menus for Nepal&apos;s restaurants · © {new Date().getFullYear()}</p>
          <div className="flex gap-5">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
            <Link href="/login" className="transition hover:text-white">Log in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
