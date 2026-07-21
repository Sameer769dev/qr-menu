'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';
import { MENU_THEMES } from '@/lib/menu-themes';

const DEMO_IMG =
  'https://www.themealdb.com/images/media/meals/1548772327.jpg'; // generic dish thumb

function Preview({ theme: T, tkey }) {
  const hero = (
    <div className={`px-3 pb-3 pt-4 text-center ${T.hero}`}>
      <p className={`text-[7px] uppercase tracking-[0.3em] ${T.heroSub}`}>Table 4</p>
      <p className={`mt-1 text-sm font-bold ${T.heroName}`}>Everest Kitchen</p>
      <span className={`mx-auto mt-1.5 block h-px w-8 ${T.heroRule}`} />
    </div>
  );
  const catHead = (
    <div className="flex items-center gap-1.5 px-3 pt-2.5">
      <span className={`h-px flex-1 ${T.catRule}`} />
      <span className={`text-[8px] font-bold uppercase tracking-[0.15em] ${T.catTitle}`}>Momo</span>
      <span className={`h-px flex-1 ${T.catRule}`} />
    </div>
  );

  return (
    <div className={`pointer-events-none overflow-hidden rounded-xl border border-black/5 ${T.page}`}>
      {hero}
      {catHead}

      {T.layout === 'elegant' && (
        <div className="space-y-2 px-3 py-2">
          {['Chicken Momo', 'Jhol Momo'].map((n, i) => (
            <div key={n} className="flex items-center gap-2">
              <div className="h-7 w-7 flex-none rounded-full bg-black/10" />
              <div className="flex flex-1 items-baseline gap-1">
                <span className={`text-[10px] ${T.name}`}>{n}</span>
                <span className={`flex-1 border-b border-dotted ${T.leader}`} />
                <span className={`text-[10px] ${T.price}`}>Rs. {220 + i * 20}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {T.layout === 'gallery' && (
        <div className="space-y-2 p-3">
          <div className={`overflow-hidden rounded-xl ${tkey === 'noir' ? 'ring-1 ring-white/10' : 'bg-white ring-1 ring-black/5'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEMO_IMG} alt="" className="aspect-[16/9] w-full object-cover" />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className={`text-[9px] font-bold ${T.name}`}>Chicken Momo</span>
              <span className={`text-[9px] ${T.price}`}>Rs. 220</span>
            </div>
          </div>
        </div>
      )}

      {T.layout === 'list' && (
        <div className="space-y-1.5 p-3">
          {['Chicken Momo', 'Veg Burger'].map((n, i) => (
            <div key={n} className={`flex items-center gap-2 rounded-lg p-1.5 ${T.surface}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEMO_IMG} alt="" className="h-6 w-6 flex-none rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className={`text-[9px] font-semibold ${T.name}`}>{n}</p>
                <p className={`text-[8px] ${T.price}`}>Rs. {220 + i * 30}</p>
              </div>
              <span className={`rounded px-1.5 py-0.5 text-[8px] ${T.addBtn}`}>Add</span>
            </div>
          ))}
        </div>
      )}

      {T.layout === 'masonry' && (
        <div className="columns-2 gap-2 p-3">
          {[0, 1].map((i) => (
            <div key={i} className={`mb-2 break-inside-avoid overflow-hidden rounded-xl ${T.surface}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEMO_IMG} alt="" className={`w-full object-cover ${i === 0 ? 'aspect-square' : 'aspect-[4/5]'}`} />
              <div className="px-1.5 py-1">
                <p className={`text-[8px] ${T.name}`}>Momo</p>
                <p className={`text-[8px] ${T.price}`}>Rs. {220 + i * 20}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {T.layout === 'grid' && (
        <div className="grid grid-cols-2 gap-2 p-3">
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEMO_IMG} alt="" className="aspect-square w-full object-cover" />
              <div className="px-1.5 py-1">
                <p className={`text-[8px] font-semibold ${T.name}`}>Momo</p>
                <p className={`text-[8px] ${T.price}`}>Rs. {220 + i * 20}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`m-3 mt-0 rounded-lg py-1.5 text-center text-[8px] font-semibold ${T.cartBar}`}>
        View order · Rs. 440
      </div>
    </div>
  );
}

export default function DesignPage() {
  const supabase = createClient();
  const { restaurant, refreshRestaurant } = useRestaurant();
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');

  const current = restaurant.menu_theme || 'elegance';

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
    setMessage(`"${MENU_THEMES[key].label}" is now live on your menu ✓`);
    refreshRestaurant();
  }

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Menu templates</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Professional menu layouts inspired by fine-dining &amp; hotel menus.
            Pick one — it goes live instantly, QR codes stay the same.
          </p>
        </div>
        <a href={`/m/${restaurant.slug}`} target="_blank" rel="noreferrer" className="btn-secondary">
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
                <Preview theme={theme} tkey={key} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-display font-bold">
                    {theme.emoji} {theme.label}
                    {active && (
                      <span className="ml-2 badge-status bg-brand-50 text-brand-700">Active</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">{theme.tagline}</p>
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

      <div className="card mt-6 max-w-2xl border-gray-200 bg-gray-50/60 p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-700">💡 Tip: photos make the difference</p>
        <p className="mt-1">
          The Gallery, Noir, and Grid templates are photo-forward — add a photo to
          each dish (Menu → item → 🔍 Find photos) so your menu looks its best.
          Élégance works beautifully even with just a few photos.
        </p>
      </div>
    </div>
  );
}
