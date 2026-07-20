'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRestaurant } from '@/lib/restaurant-context';

export default function MenuPage() {
  const supabase = createClient();
  const { restaurant } = useRestaurant();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const load = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('sort_order')
        .order('created_at'),
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('sort_order')
        .order('created_at'),
    ]);
    setCategories(catRes.data || []);
    setItems(itemRes.data || []);
    setLoading(false);
  }, [supabase, restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await supabase.from('categories').insert({
      restaurant_id: restaurant.id,
      name: newCategory.trim(),
      sort_order: categories.length,
    });
    setNewCategory('');
    load();
  }

  async function renameCategory(cat) {
    const name = prompt('Category name', cat.name);
    if (!name || name === cat.name) return;
    await supabase.from('categories').update({ name }).eq('id', cat.id);
    load();
  }

  async function deleteCategory(cat) {
    if (!confirm(`Delete "${cat.name}" and all its items? This cannot be undone.`)) return;
    await supabase.from('categories').delete().eq('id', cat.id);
    load();
  }

  async function moveCategory(cat, dir) {
    const idx = categories.findIndex((c) => c.id === cat.id);
    const swapWith = categories[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      supabase.from('categories').update({ sort_order: idx + dir }).eq('id', cat.id),
      supabase.from('categories').update({ sort_order: idx }).eq('id', swapWith.id),
    ]);
    load();
  }

  async function toggleAvailable(item) {
    await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);
    load();
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await supabase.from('menu_items').delete().eq('id', item.id);
    load();
  }

  if (loading) return <p className="text-gray-500">Loading menu…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Menu builder</h1>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            className="input w-48"
            placeholder="New category (e.g. Momo)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Add category
          </button>
        </form>
      </div>

      {categories.length === 0 && (
        <div className="card mt-8 p-8 text-center text-gray-500">
          Start by adding a category — e.g. Momo, Chowmein, Drinks, Desserts.
        </div>
      )}

      <div className="mt-6 space-y-6">
        {categories.map((cat, idx) => {
          const catItems = items.filter((i) => i.category_id === cat.id);
          return (
            <div key={cat.id} className="card">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="font-semibold">{cat.name}</h2>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-secondary px-2 py-1"
                    disabled={idx === 0}
                    onClick={() => moveCategory(cat, -1)}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-secondary px-2 py-1"
                    disabled={idx === categories.length - 1}
                    onClick={() => moveCategory(cat, 1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button className="btn-secondary px-2 py-1" onClick={() => renameCategory(cat)}>
                    Rename
                  </button>
                  <button className="btn-danger px-2 py-1" onClick={() => deleteCategory(cat)}>
                    Delete
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-gray-100">
                {catItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-11 w-11 flex-none rounded-lg border border-gray-100 object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className={`font-medium ${item.is_available ? '' : 'text-gray-400 line-through'}`}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-500 truncate max-w-md">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {restaurant.currency} {Number(item.price).toFixed(0)}
                      </span>
                      <button
                        className={`btn px-2 py-1 border ${
                          item.is_available
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                        onClick={() => toggleAvailable(item)}
                      >
                        {item.is_available ? 'Available' : 'Sold out'}
                      </button>
                      <button
                        className="btn-secondary px-2 py-1"
                        onClick={() => setEditingItem({ category_id: cat.id, item })}
                      >
                        Edit
                      </button>
                      <button className="btn-danger px-2 py-1" onClick={() => deleteItem(item)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="px-4 py-3">
                <button
                  className="btn-secondary"
                  onClick={() => setEditingItem({ category_id: cat.id, item: null })}
                >
                  + Add item
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingItem && (
        <ItemModal
          restaurant={restaurant}
          categoryId={editingItem.category_id}
          item={editingItem.item}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ItemModal({ restaurant, categoryId, item, onClose, onSaved }) {
  const supabase = createClient();
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    setError('');
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${restaurant.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('menu-images')
      .upload(path, file, { cacheControl: '31536000', upsert: false });
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      restaurant_id: restaurant.id,
      category_id: categoryId,
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price) || 0,
      image_url: imageUrl.trim() || null,
    };
    const { error: err } = item
      ? await supabase.from('menu_items').update(payload).eq('id', item.id)
      : await supabase.from('menu_items').insert(payload);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card w-full max-w-md animate-scale-in p-6">
        <h2 className="text-lg font-bold">{item ? 'Edit item' : 'Add item'}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Momo (10 pcs)"
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steamed dumplings served with tomato achar"
            />
          </div>
          <div>
            <label className="label">Price ({restaurant.currency})</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Photo (optional)</label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Item"
                  className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xl text-gray-300">
                  🍽️
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="btn-secondary cursor-pointer">
                  {uploading ? 'Uploading…' : imageUrl ? 'Change photo' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                    disabled={uploading}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    className="text-left text-xs text-red-500 hover:underline"
                    onClick={() => setImageUrl('')}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              A clear photo in good light. Items with photos sell more.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading} className="btn-primary">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
