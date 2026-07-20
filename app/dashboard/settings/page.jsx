'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';

export default function SettingsPage() {
  const supabase = createClient();
  const { restaurant, refreshRestaurant } = useRestaurant();
  const [name, setName] = useState(restaurant.name);
  const [phone, setPhone] = useState(restaurant.phone || '');
  const [address, setAddress] = useState(restaurant.address || '');
  const [currency, setCurrency] = useState(restaurant.currency);
  const [isActive, setIsActive] = useState(restaurant.is_active);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    const { error } = await supabase
      .from('restaurants')
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        currency: currency.trim() || 'Rs.',
        is_active: isActive,
      })
      .eq('id', restaurant.id);
    setSaving(false);
    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }
    setMessage('Saved ✓');
    refreshRestaurant();
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label">Restaurant name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98XXXXXXXX"
          />
        </div>
        <div>
          <label className="label">Address</label>
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Thamel, Kathmandu"
          />
        </div>
        <div>
          <label className="label">Currency symbol</label>
          <input className="input w-28" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Menu is live (uncheck to temporarily hide your public menu)
        </label>
        {message && (
          <p className={`text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold">Public menu link</h2>
        <p className="mt-1 break-all text-sm text-gray-600">/m/{restaurant.slug}</p>
        <p className="mt-2 text-xs text-gray-500">
          This is the link inside your table QR codes. Changing your restaurant
          name does not change this link, so printed QR codes keep working.
        </p>
      </div>
    </div>
  );
}
