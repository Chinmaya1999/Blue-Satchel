import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CreditCard, Smartphone, Banknote, AlertCircle, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const PAYMENT_METHODS = [
  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "cod", label: "Cash on Delivery", icon: Banknote },
];

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState({
    line1: user?.address?.line1 || "",
    line2: user?.address?.line2 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    postalCode: user?.address?.postalCode || "",
    country: "India",
  });
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const shippingFee = subtotal > 999 ? 0 : 49;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shippingFee + tax;

  if (items.length === 0) {
    return (
      <div className="container-app flex flex-col items-center gap-3 py-24 text-center">
        <ShoppingBag size={36} className="text-slate-300" />
        <p className="font-medium text-slate-500">Your bag is empty.</p>
        <Link to="/shop" className="btn-primary mt-2">Browse products</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: address,
        paymentMethod: method,
        ...(method === "card" ? { card } : {}),
        ...(method === "upi" ? { upiId } : {}),
      };
      const { data } = await api.post("/orders", payload);
      clearCart();
      navigate(`/order-confirmation/${data.order._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app max-w-5xl py-10">
      <h1 className="mb-8 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Checkout</h1>

      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-display font-semibold text-slate-900">Shipping Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Address line 1</label>
                <input required className="input" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address line 2 (optional)</label>
                <input className="input" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
              </div>
              <div>
                <label className="label">City</label>
                <input required className="input" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </div>
              <div>
                <label className="label">State</label>
                <input required className="input" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </div>
              <div>
                <label className="label">Postal code</label>
                <input required className="input" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
              </div>
              <div>
                <label className="label">Country</label>
                <input required className="input" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-display font-semibold text-slate-900">Payment Method</h2>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition ${
                    method === m.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <m.icon size={18} /> {m.label}
                </button>
              ))}
            </div>

            {method === "card" && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Card number</label>
                  <input required placeholder="4111 1111 1111 1111" className="input" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                </div>
                <div>
                  <label className="label">Expiry (MM/YY)</label>
                  <input required placeholder="12/28" className="input" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                </div>
                <div>
                  <label className="label">CVV</label>
                  <input required placeholder="123" className="input" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
                </div>
              </div>
            )}
            {method === "upi" && (
              <div className="mt-5">
                <label className="label">UPI ID</label>
                <input required placeholder="name@bank" className="input" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              </div>
            )}
            {method === "cod" && (
              <p className="mt-4 text-sm text-slate-500">Pay with cash when your order is delivered.</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        <div className="card h-fit p-6">
          <h2 className="mb-4 font-display font-semibold text-slate-900">Order Summary</h2>
          <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3">
                <img src={i.imageUrl} className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-slate-800">{i.name}</p>
                  <p className="text-xs text-slate-400">Qty {i.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700">₹{i.price * i.quantity}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-slate-500"><span>Shipping</span><span>{shippingFee === 0 ? "Free" : `₹${shippingFee}`}</span></div>
            <div className="flex justify-between text-slate-500"><span>Tax (18%)</span><span>₹{tax}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-display text-base font-bold text-slate-900"><span>Total</span><span>₹{total}</span></div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? "Placing order…" : `Place order · ₹${total}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
