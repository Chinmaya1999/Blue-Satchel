import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScanFace, Zap, Crosshair, Clock, Check, ArrowRight, Lock } from "lucide-react";
import api from "../api/axios.js";

// Scan modes offered on "Skin Scan". Only the detailed scan is live; the
// other two are listed as coming soon.
const MODES = [
  {
    key: "detailed",
    to: "/scan/detailed",
    icon: ScanFace,
    name: "Detailed Scan",
    tagline: "Our most complete analysis",
    time: "~60 sec",
    features: ["3 angles: front, left & right", "15 skin concerns scored", "Face-zone wrinkle map", "Full routine + PDF report"],
    badge: "Recommended",
    available: true,
  },
  {
    key: "quick",
    to: "/scan/quick",
    icon: Zap,
    name: "Quick Scan",
    tagline: "One selfie, instant snapshot",
    time: "~15 sec",
    features: ["Single front-facing photo", "Key concerns scored", "Overall skin score", "Short product routine"],
    badge: "Fastest",
    available: true,
  },
  {
    key: "focus",
    icon: Crosshair,
    name: "Focus Scan",
    tagline: "Zoom in on one concern",
    time: "~20 sec",
    features: ["Pick one area: acne, eyes, spots…", "Close-up, single-concern check", "Track one issue over time", "Targeted product picks"],
    available: false,
  },
];

const ScanOptions = () => {
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    api.get("/scans/quota").then(({ data }) => setQuota(data.quota)).catch(() => {});
  }, []);

  const limitReached = quota?.limit != null && quota.remaining === 0;

  return (
    <div className="fs-page fs-page-bg">
      <div className="container-app py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fs-eyebrow">AI skin assessment</p>
            <h1 className="fs-page-title mt-3">Choose your <span className="fs-gradient-text">scan</span></h1>
            <p className="fs-page-sub">Pick how deep you want to go. You can switch next time.</p>
          </div>
          {quota?.limit != null && (
            <span
              className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold ring-1 ${
                limitReached ? "bg-rose-500/10 text-rose-200 ring-rose-400/30" : "bg-cyan-400/10 text-cyan-200 ring-cyan-300/30"
              }`}
            >
              {quota.remaining} of {quota.limit} scans left today
            </span>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const card = (
              <div
                className={`card relative flex h-full flex-col rounded-3xl p-6 transition duration-300 ${
                  m.available ? "ring-1 ring-cyan-300/40 hover:-translate-y-1 hover:shadow-soft" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
                      m.available ? "bg-cyan-400/10 text-cyan-300 ring-cyan-300/30 shadow-[0_0_30px_-6px_rgba(94,231,255,0.6)]" : "bg-white/5 text-slate-400 ring-white/10"
                    }`}
                  >
                    <Icon size={22} />
                  </span>
                  {m.available ? (
                    <span className="rounded-full bg-cyan-300/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300/30">
                      {m.badge}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400 ring-1 ring-white/10">
                      <Lock size={10} /> Coming soon
                    </span>
                  )}
                </div>

                <h2 className="mt-5 font-display text-xl font-bold text-white">{m.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{m.tagline}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={13} /> {m.time}
                </p>

                <ul className="mt-5 flex-1 space-y-2">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check size={15} className={`mt-0.5 shrink-0 ${m.available ? "text-emerald-300" : "text-slate-500"}`} /> {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {!m.available ? (
                    <span className="btn-secondary pointer-events-none h-12 w-full rounded-full opacity-70">Coming soon</span>
                  ) : limitReached ? (
                    <span className="btn-secondary pointer-events-none h-12 w-full rounded-full opacity-70">Daily limit reached</span>
                  ) : (
                    <span className="btn-primary h-12 w-full rounded-full">
                      Start {m.name.toLowerCase()} <ArrowRight size={16} />
                    </span>
                  )}
                </div>
              </div>
            );
            return m.available && !limitReached ? (
              <Link key={m.key} to={m.to} className="block">
                {card}
              </Link>
            ) : (
              <div key={m.key} aria-disabled="true">
                {card}
              </div>
            );
          })}
        </div>

        {limitReached && (
          <p className="mt-6 text-sm text-slate-400">
            You've used today's {quota.limit} free scans — your limit resets at midnight (India time).{" "}
            <Link to="/scan/history" className="font-semibold text-cyan-300 hover:text-cyan-200">View past scans</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ScanOptions;
