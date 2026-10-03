import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Store, Check, Ban, MapPin } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { formatPaise } from "../../utils/money.js";

export const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  suspended: "bg-rose-50 text-rose-700",
};

const TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
];

const AdminSalons = () => {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => {
      api.get("/admin/salons", { params: { q, status }, signal: c.signal }).then(({ data }) => setData(data)).catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q, status, reload]);

  const setSalonStatus = async (id, next) => {
    await api.patch(`/admin/salons/${id}`, { status: next });
    setReload((n) => n + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Salons</h1>
        <p className="mt-1 text-sm text-slate-500">Approve new salons, feature the best ones, and manage everything they publish.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setStatus(t.value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${status === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {t.label}
              {t.value && data?.counts?.[t.value] ? <span className="ml-1.5 text-slate-400">{data.counts[t.value]}</span> : null}
            </button>
          ))}
        </div>
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search name, city, phone, email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {!data ? (
        <Loader label="Loading salons…" />
      ) : data.salons.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">No salons found.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Salon</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3 text-right">Scans</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.salons.map((s) => (
                <tr key={s._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/salons/${s._id}`} className="flex items-center gap-3">
                      {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Store size={16} /></span>}
                      <span>
                        <span className="block font-semibold text-slate-800">{s.name} {s.featured && <Star size={12} className="inline fill-amber-400 text-amber-400" />}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={11} /> {s.address?.city || "No address yet"}{!s.profileComplete && " · profile incomplete"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.owner?.name}<br />{s.owner?.email}</td>
                  <td className="px-4 py-3 text-slate-600">{s.ratingCount ? `${s.ratingAvg} (${s.ratingCount})` : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.scanCount}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatPaise(s.revenuePaise)}</td>
                  <td className="px-4 py-3"><span className={`badge capitalize ${STATUS_BADGE[s.status]}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    {s.status !== "approved" ? (
                      <button onClick={() => setSalonStatus(s._id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><Check size={13} /> Approve</button>
                    ) : (
                      <button onClick={() => setSalonStatus(s._id, "suspended")} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"><Ban size={13} /> Suspend</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSalons;
