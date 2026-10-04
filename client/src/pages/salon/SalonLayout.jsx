import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Store, Tags, Package, ScanFace, Users, Receipt, ExternalLink, Clock, Ban } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const links = [
  { to: "/salon", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/salon/profile", label: "Salon profile", icon: Store },
  { to: "/salon/pricing", label: "Plans & pricing", icon: Tags },
  { to: "/salon/products", label: "My products", icon: Package },
  { to: "/salon/scan", label: "Skin Scan", icon: ScanFace },
  { to: "/salon/scans", label: "Scan History", icon: Users },
  { to: "/salon/bills", label: "Bills", icon: Receipt },
];

const linkClass = ({ isActive }) =>
  `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

// Salon owner's dashboard. Until the salon profile is set up, every page
// redirects to the profile form.
const SalonLayout = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [state, setState] = useState(null);
  const [error, setError] = useState("");

  const reload = useCallback(
    () =>
      api
        .get("/salon/me")
        .then(({ data }) => setState(data))
        .catch((err) => setError(err.response?.data?.message || "Couldn't load your salon.")),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);

  if (error) return <div className="container-app py-20 text-center text-slate-500">{error}</div>;
  if (!state) return <Loader full label="Loading your salon…" />;

  const { salon } = state;
  if (!salon.profileComplete && pathname !== "/salon/profile") return <Navigate to="/salon/profile" replace />;

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="hidden items-center gap-3 border-b border-slate-100 px-5 py-5 lg:flex">
            {salon.logoUrl ? (
              <img src={salon.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 font-display text-sm font-bold text-white">
                {salon.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{salon.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.name} · Salon owner</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1 lg:p-4">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                <l.icon size={17} /> <span className="whitespace-nowrap">{l.label}</span>
              </NavLink>
            ))}
            {salon.status === "approved" && (
              <Link to={`/salons/${salon.slug}`} className="flex shrink-0 items-center gap-3 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-500 hover:border-brand-300 hover:text-brand-600 lg:mt-3">
                <ExternalLink size={17} /> <span className="whitespace-nowrap">View public page</span>
              </Link>
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {salon.profileComplete && salon.status === "pending" && (
            <div className="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              <Clock size={16} className="mt-0.5 shrink-0" /> Your salon is waiting for DXB BEAUTY approval. You can already set up pricing and products — it will appear on the website once approved.
            </div>
          )}
          {salon.status === "suspended" && (
            <div className="mb-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
              <Ban size={16} className="mt-0.5 shrink-0" /> Your salon is not listed on the website right now.{salon.adminNote ? ` ${salon.adminNote}` : " Contact DXB BEAUTY support for details."}
            </div>
          )}
          <Outlet context={{ ...state, reload }} />
        </div>
      </div>
    </div>
  );
};

export default SalonLayout;
