'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';
import { MENU_THEMES } from '@/lib/menu-themes';

function ThemePreview({ theme }) {
  const T = theme;
  return (
    <div className={`pointer-events-none overflow-hidden rounded-xl border border-black/5 ${T.page}`}>
      <div className={`px-3 pb-2.5 pt-3 ${T.header}`}>
        <p className="font-display text-sm font-bold">Everest Kitchen</p>
        <p className={`text-[9px] ${T.headerSub}`}>🪑 Table 4 · 📍 Thamel</p>
      </div>
      <div className={`flex gap-1 border-b px-3 py-1.5 ${T.nav}`}>
        {['Momo', 'Chowmein', 'Drinks'].map((c) => (
          <span
            key={c}
            className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold ${T.pill}`}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="space-y-1.5 p-3">
        {[
          { n: 'Chicken Momo', p: '220' },
          { n: 'Veg Chowmein', p: '160' },
        ].map((it) => (
          <div key={it.n} className={`flex items-center justify-between rounded-lg p-2 ${T.card}`}>
            <div>
              <p className="text-[10px] font-semibold">{it.n}</p>
              <p className={`text-[8px] ${T.desc}`}>Fresh & delicious</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold ${T.price}`}>Rs. {it.p}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[8px] ${T.addBtn}`}>Add</span>
            </div>
          </div>
        ))}
        <div className={`rounded-lg py-1.5 text-center text-[9px] ${T.cartBar}`}>
          View order · 2 items · Rs. 380
        </div>
      </div>
    </div>
  );
}

export default function DesignPage() {
  const supabase = createClient();
  const { restaurant, refreshRestaurant } = useRestaurant();
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');

  const current = restaurant.menu_theme || 'classic';

  async function apply(key) {
    setSaving(key);
    setMessage('');
    const { error } = await supabase
      .from('restaurants')
      .update({ menu_theme: key })
      .eq('id', restaurant.id);
    setSaving('');
    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }
    setMessage(`"${MENU_THEMES[key].name}" is now live on your menu ✓`);
    refreshRestaurant();
  }

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Menu design</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Pick the look of your public menu. Changes go live instantly — QR codes stay the same.
          </p>
        </div>
        <a
          href={`/m/${restaurant.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
        >
          Preview live menu ↗
        </a>
      </div>

      {message && (
        <p
          className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${
            message.startsWith('Error')
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {Object.entries(MENU_THEMES).map(([key, theme]) => {
          const active = current === key;
          return (
            <div
              key={key}
              className={`card overflow-hidden transition-all ${
                active ? 'ring-2 ring-brand-500 shadow-card-hover' : 'hover:shadow-card-hover'
              }`}
            >
              <div className="p-4">
                <ThemePreview theme={theme} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-display font-bold">
                    {theme.emoji} {theme.name}
                    {active && (
                      <span className="ml-2 badge-status bg-brand-50 text-brand-700">
                        Active
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-gray-500">{theme.tagline}</p>
                </div>
                <button
                  className={active ? 'btn-secondary flex-none' : 'btn-primary flex-none'}
                  disabled={active || saving === key}
                  onClick={() => apply(key)}
                >
                  {saving === key ? 'Applying…' : active ? 'In use' : 'Use this'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
