import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, Package } from "lucide-react";
import api from "../api/axios.js";
import Loader from "../components/Loader.jsx";

const OrderConfirmation = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data.order)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader full />;
  if (!order) return <div className="container-app py-20 text-center text-slate-400">Order not found.</div>;

  return (
    <div className="container-app max-w-2xl py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        <CheckCircle2 size={32} />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Order confirmed!</h1>
      <p className="mt-2 text-slate-500">Thank you — your order <span className="font-semibold text-slate-700">{order.orderNumber}</span> has been placed.</p>

      <div className="card mt-8 p-6 text-left">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Package size={16} /> Order details
        </div>
        <ul className="space-y-3">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <img src={item.imageUrl} className="h-12 w-12 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">₹{item.price * item.quantity}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
          <div className="flex justify-between text-slate-500"><span>Shipping</span><span>{order.shippingFee === 0 ? "Free" : `₹${order.shippingFee}`}</span></div>
          <div className="flex justify-between text-slate-500"><span>Tax</span><span>₹{order.tax}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-2 font-display text-base font-bold text-slate-900"><span>Total</span><span>₹{order.total}</span></div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Shipping to: {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/orders" className="btn-secondary">View orders</Link>
        <Link to="/shop" className="btn-primary">Continue shopping</Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
