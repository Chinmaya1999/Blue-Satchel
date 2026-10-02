import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const W = 640;
const H = 180;
const PAD = { l: 34, r: 14, t: 14, b: 26 };

// Overall skin score across a customer's scans, oldest to newest. One series,
// so no legend; the heading names it. Hover/focus a point for the exact value.
const ScoreTrend = ({ scans }) => {
  const [hover, setHover] = useState(null);
  const pts = [...scans].reverse(); // API returns newest first
  if (pts.length < 2) return null;

  const x = (i) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.overallScore).toFixed(1)}`).join(" ");

  const first = pts[0].overallScore;
  const last = pts[pts.length - 1].overallScore;
  const delta = last - first;
  const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const h = hover != null ? pts[hover] : null;

  return (
    <div className="card mb-8 rounded-3xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="fs-eyebrow text-[11px]">Skin score over time</p>
          <p className="mt-1 text-sm text-slate-400">
            {pts.length} scans · {fmt(pts[0].createdAt)} – {fmt(pts[pts.length - 1].createdAt)}
          </p>
        </div>
        <p className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${delta > 0 ? "bg-emerald-400/10 text-emerald-300 ring-emerald-300/25" : delta < 0 ? "bg-rose-400/10 text-rose-300 ring-rose-300/25" : "bg-white/5 text-slate-300 ring-white/10"}`}>
          <Trend size={14} /> {delta > 0 ? "+" : ""}{delta} since first scan
        </p>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Skin score went from ${first} to ${last} over ${pts.length} scans.`}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-white/10" strokeWidth="1" />
              <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-slate-500" fontSize="11">{v}</text>
            </g>
          ))}
          <path d={line} fill="none" stroke="#5ee7ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <g key={p._id}>
              <circle
                cx={x(i)} cy={y(p.overallScore)} r={hover === i ? 6 : 4.5}
                fill="#5ee7ff" stroke="#050814" strokeWidth="2"
              />
              {/* Larger invisible target than the dot */}
              <circle
                cx={x(i)} cy={y(p.overallScore)} r="16" fill="transparent" tabIndex={0} className="cursor-pointer outline-none"
                aria-label={`${fmt(p.createdAt)}: ${p.overallScore} out of 100`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              />
            </g>
          ))}
          <text x={PAD.l} y={H - 6} className="fill-slate-500" fontSize="11">{fmt(pts[0].createdAt)}</text>
          <text x={W - PAD.r} y={H - 6} textAnchor="end" className="fill-slate-500" fontSize="11">{fmt(pts[pts.length - 1].createdAt)}</text>
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl bg-[#0a1020] px-3 py-2 text-xs shadow-xl ring-1 ring-white/15"
            style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.overallScore) / H) * 100}%`, marginTop: -10 }}
          >
            <p className="font-display text-base font-bold text-white">{h.overallScore}<span className="text-slate-500">/100</span></p>
            <p className="text-slate-400">{new Date(h.createdAt).toLocaleDateString()} · {h.overallLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreTrend;
