import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Bell, ScanFace, Package, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const SKIN_TYPES = ["normal", "oily", "dry", "combination", "sensitive", "unknown"];

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    skinType: user.skinType || "unknown",
    address: {
      line1: user.address?.line1 || "",
      city: user.address?.city || "",
      state: user.address?.state || "",
      postalCode: user.address?.postalCode || "",
      country: user.address?.country || "India",
    },
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const markRead = async (id) => {
    await api.patch(`/auth/me/notifications/${id}/read`);
  };

  return (
    <div className="container-app max-w-4xl py-10">
      <div className="mb-8 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link to="/scan/history" className="btn-secondary"><ScanFace size={15} /> Scan history</Link>
        <Link to="/orders" className="btn-secondary"><Package size={15} /> Order history</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={save} className="card space-y-5 p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold text-slate-900"><User size={16} /> Profile details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Skin type</label>
              <select className="input capitalize" value={form.skinType} onChange={(e) => setForm({ ...form, skinType: e.target.value })}>
                {SKIN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <h3 className="pt-2 text-sm font-semibold text-slate-700">Default shipping address</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Address line 1</label>
              <input className="input" value={form.address.line1} onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} />
            </div>
            <div>
              <label className="label">Postal code</label>
              <input className="input" value={form.address.postalCode} onChange={(e) => setForm({ ...form, address: { ...form.address, postalCode: e.target.value } })} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={form.address.country} onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })} />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saved ? <><CheckCircle2 size={15} /> Saved</> : <><Save size={15} /> {saving ? "Saving…" : "Save changes"}</>}
          </button>
        </form>

        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-slate-900"><Bell size={16} /> Notifications</h2>
          {user.notifications?.length ? (
            <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {[...user.notifications].reverse().map((n) => (
                <li key={n._id} onClick={() => markRead(n._id)} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${n.read ? "border-slate-100 bg-slate-50" : "border-brand-100 bg-brand-50"}`}>
                  <p className="font-semibold text-slate-800">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No notifications yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
