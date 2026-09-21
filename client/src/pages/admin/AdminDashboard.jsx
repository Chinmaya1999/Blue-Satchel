import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Package, ShoppingCart, ScanFace, IndianRupee } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="card p-5">
    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
      <Icon size={18} />
    </div>
    <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/overview").then(({ data }) => setData(data));
  }, []);

  if (!data) return <Loader label="Loading overview…" />;
  const { stats, recentOrders, recentScans } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Customers" value={stats.customers} accent="bg-brand-50 text-brand-600" />
        <StatCard icon={ShoppingCart} label="Orders" value={stats.orders} accent="bg-amber-50 text-amber-600" />
        <StatCard icon={ScanFace} label="Skin Scans" value={stats.scans} accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Package} label="Active Products" value={stats.products} accent="bg-violet-50 text-violet-600" />
        <StatCard icon={IndianRupee} label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} accent="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold text-slate-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {recentOrders.map((o) => (
              <li key={o._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{o.orderNumber}</p>
                  <p className="text-xs text-slate-400">{o.user?.name}</p>
                </div>
                <span className="font-semibold text-slate-700">₹{o.total}</span>
              </li>
            ))}
            {recentOrders.length === 0 && <p className="py-4 text-sm text-slate-400">No orders yet.</p>}
          </ul>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold text-slate-900">Recent Scans</h2>
            <Link to="/admin/scans" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {recentScans.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{s.user?.name}</p>
                  <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="font-semibold text-slate-700">{s.overallScore}/100</span>
              </li>
            ))}
            {recentScans.length === 0 && <p className="py-4 text-sm text-slate-400">No scans yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
