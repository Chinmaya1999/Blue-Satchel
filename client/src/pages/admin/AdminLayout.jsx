import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Package, ShoppingCart, ScanFace, Coins, MessageCircle, MessagesSquare, ExternalLink, Store } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAdminSupportAlerts } from "../../hooks/useAdminSupportAlerts.js";

const groups = [
  {
    title: "Insights",
    links: [{ to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, desc: "Business at a glance" }],
  },
  {
    title: "Customers",
    links: [
      { to: "/admin/customers", label: "Users", icon: Users, desc: "Manage customer accounts and credits" },
      { to: "/admin/scans", label: "Scan History", icon: ScanFace, desc: "Every skin scan run on the platform" },
      { to: "/admin/support", label: "Customer Chat", icon: MessagesSquare, desc: "Live messages from customers — reply to their skin-care questions", badge: true },
      { to: "/admin/salons", label: "Salons", icon: Store, desc: "Approve salons and manage their profiles, products, reviews and bills" },
      { to: "/admin/chat-leads", label: "Chatbot Leads", icon: MessageCircle, desc: "Enquiries captured by the chatbot" },
    ],
  },
  {
    title: "Commerce",
    links: [
      { to: "/admin/products", label: "Products", icon: Package, desc: "Catalog, pricing and stock" },
      { to: "/admin/orders", label: "Orders", icon: ShoppingCart, desc: "Track and fulfil shop orders" },
      { to: "/admin/payments", label: "Credits & Payments", icon: Coins, desc: "Scan pricing, credit plans and payment activity" },
    ],
  },
];

const all = groups.flatMap((g) => g.links);

const linkClass = ({ isActive }) =>
  `group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-brand-600 text-white shadow-soft"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const AdminLayout = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const waiting = useAdminSupportAlerts(true, { alert: false }).count; // chime + tab title come from the navbar bell
  const current =
    [...all].sort((a, b) => b.to.length - a.to.length).find((l) => (l.end ? pathname === l.to : pathname.startsWith(l.to))) ||
    all[0];

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="hidden items-center gap-3 border-b border-slate-100 px-5 py-5 lg:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 font-display text-sm font-bold text-white">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name || "Admin"}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>

          {/* Desktop: grouped list */}
          <nav className="hidden space-y-5 p-4 lg:block">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>
                <div className="space-y-1">
                  {g.links.map((l) => (
                    <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                      <l.icon size={17} /> {l.label}
                      {l.badge && waiting > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{waiting}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            <Link
              to="/"
              className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
            >
              <ExternalLink size={16} /> View live site
            </Link>
          </nav>

          {/* Mobile: scrolling tabs */}
          <nav className="flex gap-2 overflow-x-auto p-3 lg:hidden">
            {all.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                <l.icon size={16} /> {l.label}
                {l.badge && waiting > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{waiting}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Admin Console</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">{current.label}</h1>
              <p className="mt-1 text-sm text-slate-500">{current.desc}</p>
            </div>
            <p className="text-sm text-slate-400">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </header>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
