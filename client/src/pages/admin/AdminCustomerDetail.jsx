import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Phone, Trash2, MapPin, FileText, RotateCcw, Save, Pencil, X } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import OsmMap, { esc } from "../../components/OsmMap.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatPlace } from "../../utils/geo.js";

const SKIN_TYPES = ["unknown", "normal", "oily", "dry", "combination", "sensitive"];

const AdminCustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get(`/admin/customers/${id}`).then(({ data }) => setData(data)).catch(() => setData({ notFound: true }));
  }, [id]);

  if (!data) return <Loader label="Loading user…" />;
  if (data.notFound) return <div className="card p-8 text-center text-slate-400">User not found.</div>;
  const { customer, scans, orders } = data;
  const loc = customer.signupLocation;
  const isSelf = me?._id === customer._id;

  const startEdit = () => {
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      skinType: customer.skinType || "unknown",
      role: customer.role,
    });
    setMessage("");
    setEditing(true);
  };

  const save = async (patch) => {
    setSaving(true);
    setMessage("");
    try {
      const { data: res } = await api.patch(`/admin/customers/${id}`, patch);
      setData((prev) => ({ ...prev, customer: res.user }));
      setEditing(false);
      setMessage("Saved.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm(`Delete ${customer.name} and all ${scans.length} of their scans? Orders are kept. This can't be undone.`)) return;
    try {
      await api.delete(`/admin/customers/${id}`);
      navigate("/admin/customers");
    } catch (err) {
      window.alert(err.response?.data?.message || "Couldn't delete this user.");
    }
  };

  const handleDeleteScan = async (scanId) => {
    if (!window.confirm("Delete this scan permanently? This can't be undone.")) return;
    setDeletingId(scanId);
    try {
      await api.delete(`/admin/scans/${scanId}`);
      setData((prev) => ({ ...prev, scans: prev.scans.filter((s) => s._id !== scanId) }));
    } catch {
      window.alert("Couldn't delete that scan. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="space-y-6">
      <Link to="/admin/customers" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ChevronLeft size={15} /> Back to users
      </Link>

      {/* Profile */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-4">
          {customer.avatarUrl ? (
            <img src={customer.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
              {customer.name?.[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
              {customer.name}
              {customer.role === "admin" && <span className="badge bg-violet-50 text-violet-700">Admin</span>}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-slate-500"><Mail size={13} /> {customer.email}</p>
            {customer.phone && <p className="flex items-center gap-1.5 text-sm text-slate-500"><Phone size={13} /> {customer.phone}</p>}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {!editing && (
              <button onClick={startEdit} className="btn-secondary py-2 text-sm"><Pencil size={14} /> Edit</button>
            )}
            {!isSelf && (
              <button onClick={handleDeleteUser} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                <Trash2 size={14} /> Delete user
              </button>
            )}
          </div>
        </div>

        <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-slate-400">Skin type</dt><dd className="mt-0.5 capitalize text-slate-700">{customer.skinType}</dd></div>
          <div><dt className="text-xs text-slate-400">Sign-in</dt><dd className="mt-0.5 capitalize text-slate-700">{customer.authProvider || "local"}{customer.googleId && customer.authProvider !== "google" ? " + Google" : ""}</dd></div>
          <div><dt className="text-xs text-slate-400">Joined</dt><dd className="mt-0.5 text-slate-700">{new Date(customer.createdAt).toLocaleString()}</dd></div>
          <div>
            <dt className="text-xs text-slate-400">Scans today</dt>
            <dd className="mt-0.5 flex items-center gap-2 text-slate-700">
              {!customer.quota ? "—" : customer.quota.limit == null ? `${customer.quota.used} (no limit)` : `${customer.quota.used} of ${customer.quota.limit}`}
              {customer.quota?.used > 0 && customer.quota.limit != null && (
                <button onClick={() => save({ resetScanQuota: true })} disabled={saving} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </dd>
          </div>
        </dl>
        {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}

        {editing && (
          <form
            onSubmit={(e) => { e.preventDefault(); save(form); }}
            className="mt-5 grid gap-3 rounded-2xl border border-slate-100 p-4 sm:grid-cols-2"
          >
            <label className="text-xs text-slate-500">Name<input required className="input mt-1" value={form.name} onChange={set("name")} /></label>
            <label className="text-xs text-slate-500">Email<input required type="email" className="input mt-1" value={form.email} onChange={set("email")} /></label>
            <label className="text-xs text-slate-500">Phone<input className="input mt-1" value={form.phone} onChange={set("phone")} /></label>
            <label className="text-xs text-slate-500">Skin type
              <select className="input mt-1 capitalize" value={form.skinType} onChange={set("skinType")}>
                {SKIN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500">Role
              <select className="input mt-1" value={form.role} onChange={set("role")} disabled={isSelf}>
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1"><Save size={14} /> {saving ? "Saving…" : "Save"}</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary"><X size={14} /></button>
            </div>
          </form>
        )}
      </div>

      {/* Signup location */}
      <div className="card p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display font-semibold text-slate-900"><MapPin size={16} /> Signup location</h3>
        {loc?.lat != null ? (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {loc.displayName || formatPlace(loc)}
              <span className="ml-2 text-xs text-slate-400">
                {loc.source === "gps" ? `GPS${loc.accuracy ? ` · ±${loc.accuracy} m` : ""}` : "Approximate (from IP)"}
                {loc.ip ? ` · IP ${loc.ip}` : ""} · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </span>
            </p>
            <OsmMap
              markers={[{ lat: loc.lat, lng: loc.lng, primary: true, popup: `<b>${esc(customer.name)}</b><br/>${esc(formatPlace(loc) || "")}` }]}
              zoom={loc.source === "gps" ? 14 : 10}
              className="h-64"
            />
          </>
        ) : (
          <p className="text-sm text-slate-400">
            No location recorded{loc?.ip ? ` (IP ${loc.ip})` : ""}. Accounts created before location capture was added don't have one.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-display font-semibold text-slate-900">Skin scan reports ({scans.length})</h3>
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
            {scans.map((s) => {
              const top = [...s.concerns].sort((a, b) => b.severity - a.severity)[0];
              return (
                <li key={s._id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                  <img src={s.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-slate-800">{s.overallScore}/100 · {s.overallLabel}</p>
                    <p className="truncate text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleString()}{top ? ` · top: ${top.label} ${top.severity}` : ""}
                    </p>
                  </div>
                  <Link to={`/admin/scan-report/${s._id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50">
                    <FileText size={14} /> Report
                  </Link>
                  <button
                    onClick={() => handleDeleteScan(s._id)}
                    disabled={deletingId === s._id}
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    aria-label="Delete scan"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
            {scans.length === 0 && <p className="text-sm text-slate-400">No scans recorded.</p>}
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-display font-semibold text-slate-900">Orders ({orders.length})</h3>
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
            {orders.map((o) => (
              <li key={o._id} className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{o.orderNumber}</p>
                  <p className="text-xs capitalize text-slate-400">{o.status} · {new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="font-semibold text-slate-700">₹{o.total}</span>
              </li>
            ))}
            {orders.length === 0 && <p className="text-sm text-slate-400">No orders placed.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerDetail;
