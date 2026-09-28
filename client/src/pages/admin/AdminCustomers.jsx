import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Trash2, Map as MapIcon, MapPin } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import OsmMap, { esc } from "../../components/OsmMap.jsx";
import { formatPlace } from "../../utils/geo.js";

const ROLES = [
  { value: "", label: "All" },
  { value: "customer", label: "Customers" },
  { value: "admin", label: "Admins" },
];

const AdminCustomers = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [locations, setLocations] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get("/admin/customers", { params: { q, role, limit: 100 }, signal: controller.signal })
      .then(({ data }) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => { if (e.name !== "CanceledError") console.error(e); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [q, role, reload]);

  useEffect(() => {
    if (showMap && !locations) api.get("/admin/customers/locations").then(({ data }) => setLocations(data.items));
  }, [showMap, locations]);

  const markers = useMemo(
    () =>
      (locations || []).map((u) => ({
        lat: u.signupLocation.lat,
        lng: u.signupLocation.lng,
        color: u.role === "admin" ? "#7c3aed" : "#0891b2",
        popup: `<b>${esc(u.name)}</b><br/>${esc(u.email)}<br/>${esc(formatPlace(u.signupLocation) || "")}<br/><small>${esc(u.signupLocation.source === "gps" ? "GPS" : "Approx. (IP)")} · joined ${esc(new Date(u.createdAt).toLocaleDateString())}</small><br/><a href="/admin/customers/${esc(u._id)}">Open profile →</a>`,
      })),
    [locations]
  );

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.name} (${u.email}) and all ${u.scanCount} of their scans? This can't be undone.`)) return;
    try {
      await api.delete(`/admin/customers/${u._id}`);
      setLocations(null);
      setReload((n) => n + 1);
    } catch (err) {
      window.alert(err.response?.data?.message || "Couldn't delete that user.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-slate-900">Users</h2>
            <p className="text-xs text-slate-400">{total} {total === 1 ? "account" : "accounts"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${role === r.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="relative w-64 max-w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input py-2 pl-9 text-sm" placeholder="Search name, email, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button onClick={() => setShowMap((v) => !v)} className={`btn-secondary py-2 text-sm ${showMap ? "ring-2 ring-brand-400" : ""}`}>
              <MapIcon size={15} /> {showMap ? "Hide map" : "Map"}
            </button>
          </div>
        </div>

        {showMap && (
          <div className="mb-5">
            {locations ? (
              <>
                <OsmMap markers={markers} zoom={11} className="h-96" />
                <p className="mt-2 text-xs text-slate-400">
                  {locations.length} users with a signup location · <span className="text-cyan-600">●</span> customer{" "}
                  <span className="text-violet-600">●</span> admin
                </p>
              </>
            ) : (
              <Loader label="Loading locations…" />
            )}
          </div>
        )}

        {loading ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Signup location</th>
                  <th className="py-2 pr-4">Scans</th>
                  <th className="py-2 pr-4">Today</th>
                  <th className="py-2 pr-4">Last score</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {u.name?.[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-slate-800">
                            {u.name}
                            {u.role === "admin" && <span className="badge bg-violet-50 text-[10px] text-violet-700">Admin</span>}
                            {u.authProvider === "google" && <span className="badge bg-slate-100 text-[10px] text-slate-500">Google</span>}
                          </p>
                          <p className="truncate text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {formatPlace(u.signupLocation) ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className={u.signupLocation.source === "gps" ? "text-emerald-500" : "text-slate-300"} />
                          {formatPlace(u.signupLocation)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{u.scanCount}</td>
                    <td className="py-3 pr-4 text-slate-500">
                      {!u.quota ? "—" : u.quota.limit == null ? `${u.quota.used} · no limit` : `${u.quota.used}/${u.quota.limit}`}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{u.lastScore != null ? `${u.lastScore}/100 · ${u.lastLabel}` : "—"}</td>
                    <td className="py-3 pr-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/customers/${u._id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50">
                          Manage <ChevronRight size={13} />
                        </Link>
                        <button onClick={() => handleDelete(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${u.name}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
