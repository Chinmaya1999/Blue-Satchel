import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";

const STATUSES = ["placed", "confirmed", "shipped", "delivered", "cancelled"];

const AdminOrders = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/admin/orders").then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const changeStatus = async (id, status) => {
    setItems((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
    await api.patch(`/admin/orders/${id}/status`, { status });
  };

  return (
    <div className="card p-5">
      <h2 className="mb-4 font-display font-semibold text-slate-900">Order Management</h2>
      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((o) => (
                <tr key={o._id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-800">{o.orderNumber}</td>
                  <td className="py-3 pr-4 text-slate-500">{o.user?.name}</td>
                  <td className="py-3 pr-4 text-slate-500">₹{o.total}</td>
                  <td className="py-3 pr-4 capitalize text-slate-500">{o.paymentMethod} · {o.paymentStatus}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus(o._id, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium capitalize"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
