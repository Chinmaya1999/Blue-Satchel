import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Package, ShoppingCart, ScanFace } from "lucide-react";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/scans", label: "Scan History", icon: ScanFace },
];

const AdminLayout = () => (
  <div className="container-app py-8">
    <div className="mb-6">
      <span className="badge bg-brand-900 text-white">Internal Operations Console</span>
      <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Business Operations</h1>
    </div>

    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <l.icon size={16} /> {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AdminLayout;
