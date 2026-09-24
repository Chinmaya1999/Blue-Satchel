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
    <div className="fs-page fs-page-bg">
    <div className="container-app max-w-5xl py-12">
      <div className="card relative mb-8 flex flex-col gap-5 overflow-hidden rounded-[2rem] p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-500 font-display text-3xl font-bold text-slate-950 shadow-[0_0_40px_-6px_rgba(94,231,255,0.7)] ring-4 ring-white/10">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <div className="relative flex-1">
          <p className="fs-eyebrow text-[11px]">Your profile</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">{user.name}</h1>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>

      <div className="relative flex flex-wrap gap-3">
        <Link to="/scan/history" className="btn-secondary rounded-full"><ScanFace size={15} /> Scan history</Link>
        <Link to="/orders" className="btn-secondary rounded-full"><Package size={15} /> Order history</Link>
      </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={save} className="card space-y-5 rounded-3xl p-6 sm:p-8">
          <h2 className="flex items-center gap-3 font-display text-lg font-semibold text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/25"><User size={16} /></span> Profile details</h2>
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

          <h3 className="fs-eyebrow border-t border-white/10 pt-6 text-[11px]">Default shipping address</h3>
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

          <button type="submit" disabled={saving} className="btn-primary rounded-full px-6">
            {saved ? <><CheckCircle2 size={15} /> Saved</> : <><Save size={15} /> {saving ? "Saving…" : "Save changes"}</>}
          </button>
        </form>

        <div className="card h-fit rounded-3xl p-6 sm:p-8">
          <h2 className="mb-5 flex items-center gap-3 font-display text-lg font-semibold text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300 ring-1 ring-indigo-300/25"><Bell size={16} /></span> Notifications</h2>
          {user.notifications?.length ? (
            <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {[...user.notifications].reverse().map((n) => (
                <li key={n._id} onClick={() => markRead(n._id)} className={`cursor-pointer rounded-2xl border p-3.5 text-sm transition hover:border-cyan-300/40 ${n.read ? "border-slate-100 bg-slate-50" : "border-brand-100 bg-brand-50 shadow-[inset_3px_0_0_#5ee7ff]"}`}>
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
    </div>
  );
};

export default Profile;
