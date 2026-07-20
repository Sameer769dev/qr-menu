'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';

const ROLES = [
  { value: 'waiter', label: 'Waiter', icon: '🧑‍💼' },
  { value: 'kitchen', label: 'Kitchen', icon: '👨‍🍳' },
  { value: 'manager', label: 'Manager', icon: '⭐' },
];

function roleMeta(role) {
  return ROLES.find((r) => r.value === role) || ROLES[0];
}

export default function StaffPage() {
  const supabase = createClient();
  const { restaurant, refreshRestaurant } = useRestaurant();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [managerPin, setManagerPin] = useState(restaurant.manager_pin || '');
  const [pinMsg, setPinMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at');
    setStaff(data || []);
    setLoading(false);
  }, [supabase, restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(member) {
    await supabase
      .from('staff')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);
    load();
  }

  async function removeStaff(member) {
    if (!confirm(`Remove ${member.name}? They can no longer enter staff mode.`))
      return;
    await supabase.from('staff').delete().eq('id', member.id);
    load();
  }

  async function saveManagerPin(e) {
    e.preventDefault();
    setPinMsg('');
    if (!/^\d{4}$/.test(managerPin)) {
      setPinMsg('Error: PIN must be exactly 4 digits.');
      return;
    }
    const { error } = await supabase
      .from('restaurants')
      .update({ manager_pin: managerPin })
      .eq('id', restaurant.id);
    setPinMsg(error ? `Error: ${error.message}` : 'Manager PIN saved ✓');
    if (!error) refreshRestaurant();
  }

  if (loading) return <p className="text-gray-500">Loading staff…</p>;

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Staff</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Staff pick their name and enter their PIN on the kitchen device.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          + Add staff member
        </button>
      </div>

      <div className="card mt-6 max-w-lg p-6">
        <h2 className="font-display font-bold">Manager PIN</h2>
        <p className="mt-1 text-sm text-gray-500">
          Required to exit staff mode on the kitchen device — this is what keeps
          staff on the Orders board and out of your menu and settings.
        </p>
        <form onSubmit={saveManagerPin} className="mt-3 flex items-center gap-2">
          <input
            className="input w-32 text-center font-mono text-lg tracking-[0.4em]"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={managerPin}
            onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" className="btn-secondary">
            Save PIN
          </button>
        </form>
        {pinMsg && (
          <p
            className={`mt-2 text-sm ${
              pinMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {pinMsg}
          </p>
        )}
        {!restaurant.manager_pin && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            ⚠️ Set a manager PIN before using staff mode.
          </p>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">
          No staff yet. Add your waiters and kitchen staff — each gets a name
          and a 4-digit PIN for the kitchen device.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((m) => {
            const meta = roleMeta(m.role);
            return (
              <div key={m.id} className={`card p-5 ${m.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl">
                    {meta.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.name}</p>
                    <p className="text-sm capitalize text-gray-500">{meta.label}</p>
                  </div>
                  <span
                    className={`ml-auto badge-status ${
                      m.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {m.is_active ? 'Active' : 'Off'}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1 py-1.5" onClick={() => setEditing(m)}>
                    Edit
                  </button>
                  <button className="btn-secondary flex-1 py-1.5" onClick={() => toggleActive(m)}>
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn-danger py-1.5" onClick={() => removeStaff(m)}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-6 max-w-2xl border-gray-200 bg-gray-50/60 p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-700">How staff mode works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>On the kitchen device, open the Orders board and tap “Enter staff mode”.</li>
          <li>The staff member picks their name and types their 4-digit PIN.</li>
          <li>The device locks to the Orders board; every status change is recorded under their name.</li>
          <li>Exiting staff mode requires the manager PIN.</li>
        </ol>
      </div>

      {editing && (
        <StaffModal
          restaurant={restaurant}
          member={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StaffModal({ restaurant, member, onClose, onSaved }) {
  const supabase = createClient();
  const [name, setName] = useState(member?.name || '');
  const [pin, setPin] = useState(member?.pin || '');
  const [role, setRole] = useState(member?.role || 'waiter');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    setSaving(true);
    const payload = {
      restaurant_id: restaurant.id,
      name: name.trim(),
      pin,
      role,
    };
    const { error: err } = member
      ? await supabase.from('staff').update(payload).eq('id', member.id)
      : await supabase.from('staff').insert(payload);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card w-full max-w-sm animate-scale-in p-6">
        <h2 className="text-lg font-bold">
          {member ? `Edit ${member.name}` : 'Add staff member'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh"
            />
          </div>
          <div>
            <label className="label">4-digit PIN</label>
            <input
              className="input w-32 text-center font-mono text-lg tracking-[0.4em]"
              required
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`btn flex-1 border ${
                    role === r.value
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
