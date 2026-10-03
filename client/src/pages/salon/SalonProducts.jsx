import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Package } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import ImageUpload from "../../components/salon/ImageUpload.jsx";
import { formatPaise, paiseToRupees, rupeesToPaise } from "../../utils/money.js";

export const CONCERN_TAGS = [
  "spots", "pores", "texture", "redness", "dark-circles", "hydration", "anti-aging",
  "acne", "brightening", "wrinkles", "firmness", "oiliness", "eye-bags",
];

const empty = { name: "", brand: "", description: "", imageUrl: "", price: "", concerns: [], active: true };

const SalonProducts = () => {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get("/salon/products").then(({ data }) => setItems(data.products));
  useEffect(() => {
    load();
  }, []);

  const open = (p) => {
    setError("");
    setEditingId(p?._id || null);
    setForm(p ? { ...empty, ...p, price: paiseToRupees(p.pricePaise) } : empty);
  };

  const submit = async (e) => {
    e.preventDefault();
    const pricePaise = rupeesToPaise(form.price);
    if (pricePaise === null) return setError("Enter a valid price.");
    setBusy(true);
    setError("");
    try {
      const body = { name: form.name, brand: form.brand, description: form.description, imageUrl: form.imageUrl, concerns: form.concerns, active: form.active, pricePaise };
      if (editingId) await api.put(`/salon/products/${editingId}`, body);
      else await api.post("/salon/products", body);
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the product.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await api.delete(`/salon/products/${p._id}`);
    load();
  };

  const toggleConcern = (c) =>
    setForm((f) => ({ ...f, concerns: f.concerns.includes(c) ? f.concerns.filter((x) => x !== c) : [...f.concerns, c] }));

  if (!items) return <Loader label="Loading products…" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">My products</h1>
          <p className="mt-1 text-sm text-slate-500">Products your salon sells. After a scan you can recommend them and add them to the customer's bill.</p>
        </div>
        <button onClick={() => open(null)} className="btn-primary rounded-full"><Plus size={16} /> Add product</button>
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-slate-400">
          <Package size={32} /> <p className="text-sm">No products yet. Add the first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p._id} className={`card overflow-hidden ${p.active ? "" : "opacity-60"}`}>
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <Package size={28} className="text-slate-300" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
                  </div>
                  <p className="shrink-0 font-display text-sm font-bold text-slate-900">{formatPaise(p.pricePaise)}</p>
                </div>
                {p.concerns.length > 0 && <p className="mt-2 text-[11px] text-slate-400">{p.concerns.join(" · ")}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className={`badge ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.active ? "Active" : "Hidden"}</span>
                  <div className="flex gap-1">
                    <button onClick={() => open(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit"><Pencil size={15} /></button>
                    <button onClick={() => remove(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" onClick={() => setForm(null)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card my-8 w-full max-w-lg space-y-4 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">{editingId ? "Edit product" : "Add product"}</h2>
              <button type="button" onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <ImageUpload value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} label="Upload photo" />
            <div>
              <label className="label">Product name *</label>
              <input className="input mt-1" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Brand</label>
                <input className="input mt-1" maxLength={60} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <label className="label">Price (₹) *</label>
                <input className="input mt-1" required inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input mt-1 min-h-[72px]" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Helps with (used to suggest it after a scan)</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CONCERN_TAGS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleConcern(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${form.concerns.includes(c) ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Available (shown on your page and in bills)
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button disabled={busy} className="btn-primary w-full justify-center rounded-full">
              {busy && <Loader2 size={16} className="animate-spin" />} {editingId ? "Save changes" : "Add product"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SalonProducts;
