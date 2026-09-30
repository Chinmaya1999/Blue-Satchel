import { Link, Navigate } from "react-router-dom";
import { Coins, Check, ArrowRight, Info } from "lucide-react";
import { usePricing } from "../context/PricingContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { DEFAULT_SCAN_COSTS } from "../utils/credits.js";

const SCANS = [
  ["detailed", "Detailed Scan", "Full 3D face mapping, zone-by-zone scores and a personalised routine."],
  ["quick", "Quick Scan", "A fast single-photo skin score with the top concerns."],
];

const Pricing = () => {
  const { pricing } = usePricing() || {};
  const { user } = useAuth();
  // Signed-in users get the full purchase page, which doubles as their pricing page.
  if (user) return <Navigate to="/credits" replace />;
  const plans = pricing?.plans ?? [];
  const costs = pricing?.costs ?? DEFAULT_SCAN_COSTS;
  const cta = user ? "/credits" : "/register";

  return (
    <div className="fs-page fs-page-bg">
      <div className="container-app py-12">
        <p className="fs-eyebrow">Pricing</p>
        <h1 className="fs-page-title mt-3">
          Simple, <span className="fs-gradient-text">pay-as-you-scan</span> pricing
        </h1>
        <p className="fs-page-sub">
          Buy a scan-credit pack once. No subscription, no auto-renewal, no billing cycle. Credits never expire.
        </p>

        {!pricing ? (
          <p className="mt-10 text-sm text-slate-400">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="mt-10 text-sm text-slate-400">Plans are unavailable right now. Please try again shortly.</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((p) => (
              <div key={p.id} className="card relative flex flex-col rounded-3xl p-5 ring-1 ring-white/10">
                {(p.popular || p.bestValue) && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-cyan-300 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-950">
                    {p.popular ? "Popular" : "Best value"}
                  </span>
                )}
                <p className="text-sm font-semibold text-slate-300">{p.name}</p>
                <p className="mt-2 font-display text-4xl font-extrabold text-white">
                  {p.charge?.currency === "INR" ? `₹${p.charge.amount}` : `$${p.priceUsd}`}
                </p>
                <p className="text-xs text-slate-400">one-time payment</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-amber-200">
                  <Coins size={14} /> {p.credits} credits
                </p>
                <ul className="mt-4 flex-1 space-y-1.5 text-xs text-slate-400">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-300" /> {Math.floor(p.credits / costs.detailed)} detailed scans</li>
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-300" />
                    {costs.quick === 0 ? "+ unlimited free quick scans" : `or ${Math.floor(p.credits / costs.quick)} quick scans`}
                  </li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-300" /> Credits never expire</li>
                </ul>
                <Link to={cta} className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-cyan-300 hover:text-slate-950">
                  Get started
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {SCANS.map(([key, name, desc]) => (
            <div key={key} className="card rounded-2xl p-5">
              <p className="font-semibold text-white">{name}</p>
              <p className="text-sm text-amber-200">{costs[key] === 0 ? "Free right now" : `${costs[key]} credits per scan`}</p>
              <p className="mt-1 text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-2 text-xs text-slate-400">
          <p className="flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> Payments are processed securely by Razorpay. Prices include applicable taxes.</p>
          <p className="flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> Failed scans return their credits automatically. See our <Link to="/refund-policy" className="text-cyan-300 hover:underline">Refund & Cancellation Policy</Link>.</p>
          <p className="flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> Skin analysis is informational and not a medical diagnosis. See our <Link to="/disclaimer" className="text-cyan-300 hover:underline">Medical Disclaimer</Link>.</p>
        </div>
        <Link to={cta} className="btn-primary mt-8 h-11 w-fit rounded-full px-6">
          {user ? "Buy credits" : "Create free account"} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default Pricing;
