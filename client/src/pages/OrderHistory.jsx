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

  if (loading) return <Loader full label="Loading orders…" />;

  return (
    <div className="container-app max-w-3xl py-10">
      <h1 className="mb-8 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Order History</h1>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <ShoppingBag size={36} className="text-slate-300" />
          <p className="font-medium text-slate-500">You haven't placed any orders yet.</p>
          <Link to="/shop" className="btn-primary mt-2">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o._id} to={`/order-confirmation/${o._id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Package size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{o.orderNumber}</p>
                  <span className={`badge capitalize ${statusColor[o.status]}`}>{o.status}</span>
                </div>
                <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString()} · {o.items.length} item(s)</p>
              </div>
              <p className="font-display font-bold text-slate-900">₹{o.total}</p>
              <ChevronRight size={18} className="text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
