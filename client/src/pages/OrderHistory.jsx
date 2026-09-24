import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import api from "../api/axios.js";
import Loader from "../components/Loader.jsx";

const statusColor = {
  placed: "bg-slate-100 text-slate-600",
  confirmed: "bg-brand-50 text-brand-700",
  shipped: "bg-amber-50 text-amber-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders").then(({ data }) => setOrders(data.orders)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="fs-page fs-page-bg"><Loader full label="Loading orders…" /></div>;

  return (
    <div className="fs-page fs-page-bg">
    <div className="container-app max-w-3xl py-12">
      <div className="mb-10">
        <p className="fs-eyebrow">Your orders</p>
        <h1 className="fs-page-title mt-3">Order <span className="fs-gradient-text">history</span></h1>
      </div>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 rounded-3xl p-14 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/25 shadow-[0_0_40px_-8px_rgba(94,231,255,0.5)]"><ShoppingBag size={32} /></span>
          <p className="font-medium text-slate-500">You haven't placed any orders yet.</p>
          <Link to="/shop" className="btn-primary mt-2 rounded-full">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o._id} to={`/order-confirmation/${o._id}`} className="card group flex items-center gap-4 rounded-3xl p-4 transition hover:shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-cyan-300/25">
                <Package size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{o.orderNumber}</p>
                  <span className={`badge capitalize ${statusColor[o.status]}`}>{o.status}</span>
                </div>
                <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString()} · {o.items.length} item(s)</p>
              </div>
              <p className="font-display text-lg font-bold text-white">₹{o.total}</p>
              <ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

export default OrderHistory;
