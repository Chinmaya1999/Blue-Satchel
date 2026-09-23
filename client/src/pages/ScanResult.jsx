import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ScanFace,
  Clock,
  RotateCcw,
  History,
  Target,
  CircleDot,
  Layers,
  Flame,
  Moon,
  Waves,
  Zap,
  Droplet,
  Sparkles,
  Gem,
  Sun,
  Eye,
  Frown,
  FileDown,
  Braces,
  BadgeCheck,
  FlaskConical,
  ChevronDown,
} from "lucide-react";
import api from "../api/axios.js";
import Loader from "../components/Loader.jsx";
import ScoreRing from "../components/ScoreRing.jsx";
import ProductCard from "../components/ProductCard.jsx";
import ScanReport from "../components/ScanReport.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const CONCERN_ICONS = {
  spots: Target,
  pores: CircleDot,
  texture: Layers,
  redness: Flame,
  "dark-circles": Moon,
  wrinkles: Waves,
  acne: Zap,
  oiliness: Droplet,
  moisture: Sparkles,
  firmness: Gem,
  radiance: Sun,
  "eye-bags": Eye,
  "droopy-upper-eyelid": Frown,
  "droopy-lower-eyelid": Frown,
  "tear-trough": Eye,
};

// Approximate anatomical placement for the hd_wrinkle per-region overlay, as
// percentages of the hero photo box — the front capture is cropped tightly
// to a centered face (see ScanCapture.jsx), so these are stable enough for
// a front-facing shot without needing per-photo landmark detection.
const FACE_REGION_POSITIONS = {
  forehead: { top: "20%", left: "32%" },
  glabellar: { top: "34%", left: "50%" },
  crowfeet: { top: "42%", left: "20%" },
  periocular: { top: "46%", left: "68%" },
  nasolabial: { top: "66%", left: "30%" },
  marionette: { top: "78%", left: "66%" },
};

const REGION_RING_STYLE = {
  Low: "border-emerald-400 text-emerald-700",
  Medium: "border-amber-400 text-amber-700",
  High: "border-rose-400 text-rose-700",
};

const LEVEL_STYLE = {
  Low: { icon: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500", badge: "badge-low" },
  Medium: { icon: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-500", badge: "badge-medium" },
  High: { icon: "text-rose-600", bg: "bg-rose-50", bar: "bg-rose-500", badge: "badge-high" },
};

const INSIGHT = {
  Excellent: "Your skin is in great shape. Stick with your current routine to hold onto these results.",
  Good: "Your skin is doing well overall — a few targeted products can help close the remaining gaps.",
  Fair: "There's real room to improve. The concerns below are worth addressing with a consistent routine.",
  "Needs Care": "Your skin needs some extra attention right now. We've matched products to your top concerns below.",
};

const reportFileName = (scan, ext) =>
  `blue-satchel-skin-report-${new Date(scan.createdAt).toISOString().slice(0, 10)}-${scan._id.slice(-6)}.${ext}`;

// Saves the scan as JSON, including Perfect Corp's raw API output
// (rawMetrics.perfectCorpOutput) exactly as the API returned it.
const downloadJson = (scan) => {
  const data = {
    reportId: scan._id,
    createdAt: scan.createdAt,
    provider: scan.provider,
    overallScore: scan.overallScore,
    overallLabel: scan.overallLabel,
    skinAge: scan.rawMetrics?.skinAge ?? null,
    concerns: scan.concerns,
    faceRegions: scan.faceRegions,
    apiResponse: scan.rawMetrics?.perfectCorpOutput ?? null,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = reportFileName(scan, "json");
  a.click();
  URL.revokeObjectURL(url);
};

// The browser's print dialog offers both "Save as PDF" and a real printer.
// The document title becomes the suggested PDF file name.
const printReport = (scan) => {
  const previousTitle = document.title;
  document.title = reportFileName(scan, "pdf").replace(/\.pdf$/, "");
  window.addEventListener("afterprint", () => (document.title = previousTitle), { once: true });
  window.print();
};

// One "Download" button with two choices. Opens upward because it sits at
// the bottom of the hero, whose overflow-hidden would clip a downward menu.
const DownloadMenu = ({ scan }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hasApiData = Boolean(scan.rawMetrics?.perfectCorpOutput);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const choose = (action) => {
    setOpen(false);
    action(scan);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20"
      >
        <FileDown size={15} /> Download <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl bg-white p-1.5 shadow-soft ring-1 ring-slate-200">
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(printReport)}
            className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
          >
            <FileDown size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              <span className="block text-sm font-semibold text-slate-800">PDF report</span>
              <span className="block text-xs text-slate-500">A4 report to save as PDF or print</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!hasApiData}
            onClick={() => choose(downloadJson)}
            className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Braces size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              <span className="block text-sm font-semibold text-slate-800">API data (JSON)</span>
              <span className="block text-xs text-slate-500">
                {hasApiData ? "Raw Perfect Corp response for this scan" : "Not available for demo scans"}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

const ScanResult = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/scans/${id}`)
      .then(({ data }) => setScan(data.scan))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader full label="Loading your results…" />;
  if (!scan) return <div className="container-app py-20 text-center text-slate-400">Scan not found.</div>;

  return (
    <div className="bg-slate-50">
      {/* Split hero: face left, key concerns right */}
      <section className="grid lg:grid-cols-2">
        {/* Left: photo + score */}
        <div className="relative min-h-[420px] overflow-hidden bg-slate-950 lg:min-h-[600px]">
          <img src={scan.imageUrl} alt="Your scan" className="h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-transparent" />

          {/* Per-region wrinkle breakdown (Perfect Corp's hd_wrinkle), when available */}
          {scan.faceRegions?.map((r) => {
            const pos = FACE_REGION_POSITIONS[r.key];
            if (!pos) return null;
            const healthScore = ((100 - r.severity) / 10).toFixed(1);
            const ring = REGION_RING_STYLE[r.level] || REGION_RING_STYLE.Low;
            return (
              <div
                key={r.key}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
                style={{ top: pos.top, left: pos.left }}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white/95 font-display text-sm font-bold shadow-lg backdrop-blur-sm ${ring}`}
                >
                  {healthScore}
                </span>
                <span className="rounded-full bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  {r.label}
                </span>
              </div>
            );
          })}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6 sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/15">
              <ScanFace size={13} /> Skin Analysis Report
              {scan.provider === "perfectcorp" ? (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] text-emerald-200">
                  <BadgeCheck size={11} /> Live AI
                </span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">
                  <FlaskConical size={11} /> Demo data
                </span>
              )}
            </span>
            <div className="flex flex-col items-end gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm ring-1 ring-white/15 sm:flex">
                <Clock size={12} /> {new Date(scan.createdAt).toLocaleString()}
              </span>
              {(scan.leftImageUrl || scan.rightImageUrl) && (
                <div className="flex gap-2">
                  {scan.leftImageUrl && (
                    <img src={scan.leftImageUrl} alt="Left angle" className="h-14 w-14 rounded-xl object-cover ring-2 ring-white/20" />
                  )}
                  {scan.rightImageUrl && (
                    <img src={scan.rightImageUrl} alt="Right angle" className="h-14 w-14 rounded-xl object-cover ring-2 ring-white/20" />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Your results are in</h1>
            <div className="mt-6 flex items-end gap-6">
              <ScoreRing score={scan.overallScore} label={scan.overallLabel} size={128} stroke={10} />
              <div className="pb-2">
                <p className="max-w-xs text-sm leading-relaxed text-white/85">
                  {INSIGHT[scan.overallLabel] || INSIGHT.Fair}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link to="/scan" className="btn bg-white text-brand-800 hover:bg-brand-50">
                    <RotateCcw size={15} /> Scan again
                  </Link>
                  <Link to="/scan/history" className="btn bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20">
                    <History size={15} /> History
                  </Link>
                  <DownloadMenu scan={scan} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: key concerns */}
        <div className="flex flex-col justify-center bg-white p-6 sm:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key Concerns</p>
          <h2 className="mt-1 font-display text-xl font-bold text-slate-900">What your scan found</h2>

          <div className="mt-6 space-y-3">
            {scan.concerns.map((c) => {
              const Icon = CONCERN_ICONS[c.key] || Target;
              const style = LEVEL_STYLE[c.level] || LEVEL_STYLE.Low;
              return (
                <div key={c.key} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:shadow-card">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.icon}`}>
                    <Icon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                      <span className={style.badge}>{c.level}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${style.bar} transition-all duration-700`} style={{ width: `${c.severity}%` }} />
                    </div>
                  </div>
                  <span className="w-8 shrink-0 text-right font-display text-sm font-bold text-slate-700">{c.severity}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recommended products */}
      <section className="container-app py-14">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Personalized routine</p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">Recommended for you</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-brand-600 hover:underline">View all products</Link>
        </div>
        {scan.recommendedProducts?.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {scan.recommendedProducts.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <p className="text-slate-400">No recommendations available yet.</p>
        )}
      </section>

      <ScanReport scan={scan} user={user} insight={INSIGHT[scan.overallLabel] || INSIGHT.Fair} />
    </div>
  );
};

export default ScanResult;
