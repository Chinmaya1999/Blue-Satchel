import { Link, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ScanFace, Receipt, IndianRupee, Package, Coins } from "lucide-react";
import api from "../../api/axios.js";
import { formatPaise } from "../../utils/money.js";
import { Stars } from "../../components/salon/StarRating.jsx";

const STATUS = {
  pending: { label: "Awaiting approval", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "Live on DXB Beauty", cls: "bg-emerald-50 text-emerald-700" },
  suspended: { label: "Suspended", cls: "bg-rose-50 text-rose-700" },
};

const SalonOverview = () => {
  const { salon, credits, planPurchased } = useOutletContext();
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/salon/stats").then(({ data }) => setData(data));
  }, []);

  const pricesSet = Object.values(salon.scanPrices || {}).some((p) => p > 0);
  const steps = [
    { done: salon.profileComplete, label: "Set up your salon profile", to: "/salon/profile" },
    { done: planPurchased, label: "Buy a pricing plan (scan credits)", to: "/salon/pricing" },
    { done: pricesSet, label: "Set your customer scan price", to: "/salon/pricing" },
    { done: (data?.stats.products ?? 0) > 0, label: "Add your products", to: "/salon/products" },
    { done: (data?.stats.scans ?? 0) > 0, label: "Scan your first customer", to: "/salon/scan" },
  ];
  const s = data?.stats;
  const st = STATUS[salon.status];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{salon.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className={`badge ${st.cls}`}>{st.label}</span>
            {salon.ratingCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Stars value={salon.ratingAvg} /> {salon.ratingAvg} ({salon.ratingCount})
              </span>
            )}
          </p>
        </div>
        <Link to="/salon/scan" className="btn-primary rounded-full">
          <ScanFace size={16} /> Scan a customer
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Coins, label: "Scan credits", value: credits.balance, to: "/salon/pricing" },
          { icon: ScanFace, label: "Customers scanned", value: s?.scans ?? "…" },
          { icon: IndianRupee, label: "Revenue collected", value: s ? formatPaise(s.revenuePaise) : "…" },
          { icon: Receipt, label: "Unpaid bills", value: s ? formatPaise(s.outstandingPaise) : "…" },
        ].map((c) => {
          const body = (
            <>
              <c.icon size={18} className="text-brand-600" />
              <p className="mt-3 font-display text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </>
          );
          return c.to ? (
            <Link key={c.label} to={c.to} className="card p-5 transition hover:shadow-soft">{body}</Link>
          ) : (
            <div key={c.label} className="card p-5">{body}</div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Getting started</h2>
          <ul className="mt-3 space-y-1">
            {steps.map((step) => (
              <li key={step.label}>
                <Link to={step.to} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  {step.done ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-slate-300" />}
                  <span className={step.done ? "text-slate-400 line-through" : "text-slate-700"}>{step.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Latest reviews</h2>
          {data?.reviews?.length ? (
            <ul className="mt-3 space-y-3">
              {data.reviews.map((r) => (
                <li key={r._id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} size={12} />
                    <span className="font-medium text-slate-700">{(r.user?.name || "Customer").split(" ")[0]}</span>
                  </div>
                  {r.comment && <p className="mt-0.5 text-slate-500">{r.comment}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">No reviews yet. Once you're live, customers can rate your salon.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default SalonOverview;
