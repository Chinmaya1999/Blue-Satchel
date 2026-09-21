import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";

const emptyForm = {
  name: "", brand: "Blue Satchel", description: "", category: "serum", price: "", compareAtPrice: "",
  imageUrl: "", tags: "", skinTypes: "", stock: 100, bestseller: false,
};

const AdminProducts = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/admin/products").then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, brand: p.brand, description: p.description, category: p.category,
      price: p.price, compareAtPrice: p.compareAtPrice || "", imageUrl: p.imageUrl,
      tags: p.tags.join(", "), skinTypes: p.skinTypes.join(", "), stock: p.stock, bestseller: p.bestseller,
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      stock: Number(form.stock),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      skinTypes: form.skinTypes.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editing) await api.patch(`/admin/products/${editing._id}`, payload);
    else await api.post("/admin/products", payload);
    setShowForm(false);
    load();
  };

  const deactivate = async (id) => {
    if (!confirm("Deactivate this product?")) return;
    await api.delete(`/admin/products/${id}`);
    load();
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display font-semibold text-slate-900">Product Management</h2>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add product</button>
      </div>

      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="flex items-center gap-3 py-3 pr-4">
                    <img src={p.imageUrl} className="h-9 w-9 rounded-lg object-cover" />
                    <span className="font-medium text-slate-800">{p.name}</span>
                  </td>
                  <td className="py-3 pr-4 capitalize text-slate-500">{p.category}</td>
                  <td className="py-3 pr-4 text-slate-500">₹{p.price}</td>
                  <td className="py-3 pr-4 text-slate-500">{p.stock}</td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={15} /></button>
                      <button onClick={() => deactivate(p._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-slate-900">{editing ? "Edit product" : "Add product"}</h3>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input required placeholder="Product name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea required placeholder="Description" rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {["cleanser", "serum", "moisturizer", "sunscreen", "treatment", "toner", "mask"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input required type="number" placeholder="Price" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Compare-at price (optional)" className="input" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
                <input type="number" placeholder="Stock" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <input required placeholder="Image URL" className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              <input placeholder="Tags (comma separated, e.g. spots, pores)" className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              <input placeholder="Skin types (comma separated)" className="input" value={form.skinTypes} onChange={(e) => setForm({ ...form, skinTypes: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.bestseller} onChange={(e) => setForm({ ...form, bestseller: e.target.checked })} /> Mark as bestseller
              </label>
            </div>
            <button type="submit" className="btn-primary mt-5 w-full">{editing ? "Save changes" : "Create product"}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
