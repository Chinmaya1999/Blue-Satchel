import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Ban, Star, Trash2, Eye, EyeOff, Loader2, Save, ExternalLink } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { Stars } from "../../components/salon/StarRating.jsx";
import { formatPaise } from "../../utils/money.js";
import { STATUS_BADGE } from "./AdminSalons.jsx";

const AdminSalonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () =>
    api.get(`/admin/salons/${id}`).then(({ data }) => {
      setData(data);
      const s = data.salon;
      setForm({
        name: s.name, tagline: s.tagline || "", description: s.description || "", phone: s.phone || "", email: s.email || "",
        website: s.website || "", gstin: s.gstin || "", city: s.address?.city || "", state: s.address?.state || "",
        line1: s.address?.line1 || "", postalCode: s.address?.postalCode || "", lat: s.location?.lat ?? "", lng: s.location?.lng ?? "",
        services: (s.services || []).join(", "), adminNote: s.adminNote || "",
      });
    });
  useEffect(() => {
    load();
  }, [id]);

  if (!data || !form) return <Loader label="Loading salon…" />;
  const { salon, products, reviews, bills, scanCount } = data;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const patch = async (body, done) => {
    setBusy(true);
    setMsg("");
    try {
      await api.patch(`/admin/salons/${id}`, body);
      await load();
      setMsg(done || "Saved.");
    } catch (err) {
      setMsg(err.response?.data?.message || "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = (e) => {
    e.preventDefault();
    patch({
      name: form.name, tagline: form.tagline, description: form.description, phone: form.phone, email: form.email,
      website: form.website, gstin: form.gstin, adminNote: form.adminNote,
      address: { line1: form.line1, city: form.city, state: form.state, postalCode: form.postalCode },
      location: { lat: form.lat, lng: form.lng },
      services: form.services.split(",").map((x) => x.trim()).filter(Boolean),
    });
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${salon.name}" with its products, reviews and bills? The owner's account stays.`)) return;
    await api.delete(`/admin/salons/${id}`);
    navigate("/admin/salons");
  };

  const productAction = async (fn) => {
    await fn();
    load();
  };

  const revenue = bills.filter((b) => b.status === "paid").reduce((n, b) => n + b.totalPaise, 0);

  return (
    <div className="space-y-6">
      <Link to="/admin/salons" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> All salons</Link>

      <div className="flex flex-wrap items-center gap-4">
        {salon.logoUrl && <img src={salon.logoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-slate-900">{salon.name}</h1>
          <p className="text-sm text-slate-500">Owner: {salon.owner?.name} · {salon.owner?.email} · {salon.owner?.credits ?? 0} credits</p>
        </div>
        <span className={`badge capitalize ${STATUS_BADGE[salon.status]}`}>{salon.status}</span>
        {salon.status === "approved" && <Link to={`/salons/${salon.slug}`} className="btn-secondary rounded-full"><ExternalLink size={15} /> Public page</Link>}
      </div>

      <div className="flex flex-wrap gap-2">
        {salon.status !== "approved" && <button disabled={busy} onClick={() => patch({ status: "approved" }, "Approved — the salon is now listed.")} className="btn-primary rounded-full"><Check size={15} /> Approve</button>}
        {salon.status === "approved" && <button disabled={busy} onClick={() => patch({ status: "suspended" }, "Suspended.")} className="btn-secondary rounded-full"><Ban size={15} /> Suspend</button>}
        <button disabled={busy} onClick={() => patch({ featured: !salon.featured }, salon.featured ? "Removed from featured." : "Featured on the site.")} className="btn-secondary rounded-full">
          <Star size={15} className={salon.featured ? "fill-amber-400 text-amber-400" : ""} /> {salon.featured ? "Unfeature" : "Feature"}
        </button>
        <button onClick={remove} className="btn-danger rounded-full"><Trash2 size={15} /> Delete salon</button>
        {msg && <span className="self-center text-sm text-slate-500">{msg}</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[["Customers scanned", scanCount], ["Bills", bills.length], ["Revenue (recent)", formatPaise(revenue)], ["Rating", salon.ratingCount ? `${salon.ratingAvg} (${salon.ratingCount})` : "—"]].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 font-display text-xl font-bold text-slate-900">{v}</p></div>
        ))}
      </div>

      <form onSubmit={saveDetails} className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-800">Salon details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[["name", "Name"], ["tagline", "Tagline"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"], ["gstin", "GSTIN"], ["line1", "Address"], ["city", "City"], ["state", "State"], ["postalCode", "PIN"], ["lat", "Latitude"], ["lng", "Longitude"]].map(([k, l]) => (
            <div key={k}><label className="label">{l}</label><input className="input mt-1" value={form[k]} onChange={set(k)} /></div>
          ))}
        </div>
        <div><label className="label">About</label><textarea className="input mt-1 min-h-[72px]" value={form.description} onChange={set("description")} /></div>
        <div><label className="label">Services (comma separated)</label><input className="input mt-1" value={form.services} onChange={set("services")} /></div>
        <div><label className="label">Internal note / reason shown to owner on suspension</label><input className="input mt-1" maxLength={500} value={form.adminNote} onChange={set("adminNote")} /></div>
        <button disabled={busy} className="btn-primary rounded-full">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save details</button>
      </form>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Products ({products.length})</h2>
        {products.length === 0 ? <p className="mt-3 text-sm text-slate-400">No products.</p> : (
          <ul className="mt-3 divide-y divide-slate-100">
            {products.map((p) => (
              <li key={p._id} className="flex items-center gap-3 py-2.5 text-sm">
                {p.imageUrl && <img src={p.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                <span className={`min-w-0 flex-1 truncate ${p.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{p.name}</span>
                <span className="text-slate-600">{formatPaise(p.pricePaise)}</span>
                <button title={p.active ? "Hide" : "Show"} onClick={() => productAction(() => api.patch(`/admin/salons/${id}/products/${p._id}`, { active: !p.active }))} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">{p.active ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                <button title="Delete" onClick={() => window.confirm("Delete this product?") && productAction(() => api.delete(`/admin/salons/${id}/products/${p._id}`))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? <p className="mt-3 text-sm text-slate-400">No reviews.</p> : (
            <ul className="mt-3 divide-y divide-slate-100">
              {reviews.map((r) => (
                <li key={r._id} className="flex items-start gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><Stars value={r.rating} size={12} /><span className="text-xs text-slate-500">{r.user?.name} · {r.user?.email}</span></div>
                    {r.comment && <p className="mt-0.5 text-slate-600">{r.comment}</p>}
                  </div>
                  <button title="Delete review" onClick={() => window.confirm("Delete this review?") && productAction(() => api.delete(`/admin/salons/${id}/reviews/${r._id}`))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Recent bills</h2>
          {bills.length === 0 ? <p className="mt-3 text-sm text-slate-400">No bills.</p> : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {bills.map((b) => (
                <li key={b._id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-slate-700">{b.invoiceNumber} · {b.customer?.name}</span>
                  <span><span className={`badge mr-2 ${b.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{b.status}</span>{formatPaise(b.totalPaise)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminSalonDetail;
