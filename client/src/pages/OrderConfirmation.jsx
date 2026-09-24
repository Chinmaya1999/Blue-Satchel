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

  if (loading) return <div className="fs-page fs-page-bg"><Loader full /></div>;
  if (!order) return <div className="fs-page fs-page-bg"><div className="container-app py-20 text-center text-slate-400">Order not found.</div></div>;

  return (
    <div className="fs-page fs-page-bg">
    <div className="container-app max-w-2xl py-16 text-center">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/40 shadow-[0_0_60px_-10px_rgba(52,211,153,0.7)]">
          <CheckCircle2 size={40} />
        </span>
      </div>
      <p className="fs-eyebrow mt-8">Order placed</p>
      <h1 className="fs-page-title mt-3">Order <span className="fs-gradient-text">confirmed!</span></h1>
      <p className="mt-2 text-slate-500">Thank you — your order <span className="font-semibold text-slate-700">{order.orderNumber}</span> has been placed.</p>

      <div className="card mt-10 rounded-3xl p-6 text-left sm:p-8">
        <div className="fs-eyebrow mb-5 flex items-center gap-2 text-[11px]">
          <Package size={16} /> Order details
        </div>
        <ul className="space-y-3">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <img src={item.imageUrl} className="fs-product-tile h-14 w-14 rounded-xl object-cover" />
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
          <div className="flex justify-between border-t border-slate-100 pt-3 font-display text-lg font-bold text-white"><span>Total</span><span className="fs-gradient-text">₹{order.total}</span></div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Shipping to: {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/orders" className="btn-secondary rounded-full">View orders</Link>
        <Link to="/shop" className="btn-primary rounded-full">Continue shopping</Link>
      </div>
    </div>
    </div>
  );
};

export default OrderConfirmation;
