import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Smartphone, Banknote, AlertCircle, ShoppingBag, ShieldCheck } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import { loadRazorpay } from "../utils/razorpay.js";
import { useLocale } from "../context/LocaleContext.jsx";
import { COUNTRIES, countryByName } from "../utils/countries.js";

const PAYMENT_METHODS = [
  { id: "razorpay", label: "Pay online", hint: "UPI, QR, cards, netbanking", icon: Smartphone },
  { id: "cod", label: "Cash on Delivery", hint: "Pay when it arrives", icon: Banknote },
];

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { country: localeCountry } = useLocale();

  const [address, setAddress] = useState({
    line1: user?.address?.line1 || "",
    line2: user?.address?.line2 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    postalCode: user?.address?.postalCode || "",
    country: countryByName(user?.address?.country)?.name || countryByName(user?.signupLocation?.country)?.name || localeCountry?.name || "India",
  });
  // Shipping, tax and Cash-on-Delivery availability for the destination country (priced by the server).
  const [quote, setQuote] = useState(null);
  const [method, setMethod] = useState("razorpay");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) return undefined;
    let cancelled = false;
    setQuote(null);
    api
      .post("/orders/quote", { items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })), country: address.country })
      .then(({ data }) => {
        if (cancelled) return;
        setQuote(data);
        if (!data.codAvailable) setMethod((m) => (m === "cod" ? "razorpay" : m));
      })
      .catch(() => !cancelled && setQuote(null));
    return () => { cancelled = true; };
  }, [items, address.country]);

  const { shippingFee = 0, tax = 0, taxLabel = "Tax", total = subtotal } = quote || {};

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
    const done = (order) => {
      clearCart();
      navigate(`/order-confirmation/${order._id}`);
    };
    try {
      if (method === "razorpay" && !(await loadRazorpay())) {
        throw new Error("Couldn't load the payment window. Check your connection and try again.");
      }
      const { data } = await api.post("/orders", {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: address,
        paymentMethod: method,
      });
      if (method === "cod") return done(data.order);

      // Online: pay in Razorpay Checkout; our server verifies it before confirming.
      const checkout = new window.Razorpay({
        key: data.razorpay.keyId,
        order_id: data.razorpay.orderId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: "DXB BEAUTY",
        description: `Order ${data.order.orderNumber}`,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: "#22d3ee" },
        handler: async (response) => {
          try {
            const { data: verified } = await api.post(`/orders/${data.order._id}/verify`, response);
            done(verified.order);
          } catch (err) {
            setError(err.response?.data?.message || "We couldn't confirm your payment. If you were charged, please contact support.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled — your bag is saved. You can try again.");
            setLoading(false);
          },
        },
      });
      checkout.on("payment.failed", (resp) => {
        const reason = resp.error?.description || "Payment failed.";
        setError(`${reason} You can try again.`);
        api.post(`/orders/${data.order._id}/payment-failed`, { reason }).catch(() => {});
      });
      checkout.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not place order.");
      setLoading(false);
    }
  };

  return (
    <div className="fs-page fs-page-bg">
    <div className="container-app max-w-5xl py-12">
      <div className="mb-10">
        <p className="fs-eyebrow">Secure checkout</p>
        <h1 className="fs-page-title mt-3">Check<span className="fs-gradient-text">out</span></h1>
      </div>

      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="card rounded-3xl p-6 sm:p-8">
            <h2 className="mb-6 flex items-center gap-3 font-display text-lg font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-xs text-cyan-300 ring-1 ring-cyan-300/30">01</span> Shipping Address</h2>
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
                <select required className="input" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.name} className="text-slate-900">{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card rounded-3xl p-6 sm:p-8">
            <h2 className="mb-6 flex items-center gap-3 font-display text-lg font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-xs text-cyan-300 ring-1 ring-cyan-300/30">02</span> Payment Method</h2>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.filter((m) => m.id !== "cod" || quote?.codAvailable !== false).map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-xs font-medium transition ${
                    method === m.id ? "border-brand-500 bg-brand-50 text-brand-700 shadow-[0_0_30px_-10px_rgba(94,231,255,0.7)]" : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <m.icon size={18} /> {m.label}
                  <span className="text-[10px] font-normal opacity-70">{m.hint}</span>
                </button>
              ))}
            </div>

            {method === "razorpay" && (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck size={15} className="shrink-0 text-emerald-500" /> You'll pay securely in Razorpay's window — UPI, QR, cards, netbanking or wallets.
              </p>
            )}
            {quote?.international && (
              <p className="mt-3 text-xs text-slate-500">
                International order: Cash on Delivery isn't available, and your country may charge import duty or VAT on delivery. Charged in INR.
              </p>
            )}
            {method === "cod" && (
              <p className="mt-4 text-sm text-slate-500">Pay with cash when your order is delivered.</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-400/25">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        <div className="card h-fit rounded-3xl p-6 sm:p-8 lg:sticky lg:top-24">
          <h2 className="mb-5 font-display text-lg font-semibold text-white">Order Summary</h2>
          <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3">
                <img src={i.imageUrl} className="fs-product-tile h-14 w-14 rounded-xl object-cover" />
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
            <div className="flex justify-between text-slate-500"><span>{taxLabel}</span><span>₹{tax}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-3 font-display text-lg font-bold text-white"><span>Total</span><span className="fs-gradient-text">{quote ? `₹${total}` : "…"}</span></div>
          </div>
          <button type="submit" disabled={loading || !quote} className="btn-primary mt-6 h-12 w-full rounded-full">
            {loading ? "Processing…" : method === "cod" ? `Place order · ₹${total}` : `Pay ₹${total}`}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
};

export default Checkout;
