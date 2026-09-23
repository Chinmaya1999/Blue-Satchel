import { useMemo, useState } from "react";
import { Cpu, Layers, ImageOff, Eye, EyeOff } from "lucide-react";

// Shows everything Perfect Corp returned for a scan (rawMetrics.perfectCorpOutput):
// every measurement with its ui_score and raw_score, each task's composite
// score and skin age, and the per-concern overlay masks on the analysed photo.
// The raw JSON itself is available from Download → API data (JSON).

const METRIC_LABELS = {
  age_spot: "Spots",
  pore: "Pores",
  texture: "Texture",
  redness: "Redness",
  dark_circle_v2: "Dark Circles",
  acne: "Acne",
  oiliness: "Oiliness",
  moisture: "Moisture",
  firmness: "Firmness",
  radiance: "Radiance",
  eye_bag: "Eye Bags",
  droopy_upper_eyelid: "Upper Eyelid",
  droopy_lower_eyelid: "Lower Eyelid",
  tear_trough: "Under-Eye Hollows",
  wrinkle: "Wrinkles",
};

const REGION_LABELS = {
  whole: "Whole face",
  forehead: "Forehead",
  glabellar: "Glabellar",
  crowfeet: "Crow's Feet",
  periocular: "Periocular",
  nasolabial: "Nasolabial",
  marionette: "Marionette",
};

// Perfect Corp's signed mask/image URLs carry X-Amz-Expires=7200.
const MASK_TTL_MS = 2 * 60 * 60 * 1000;

// ui_score is 0-100, higher = healthier. Same cut-offs as the server's
// levelFor(), which works on severity = 100 - ui_score.
const tone = (uiScore) =>
  uiScore > 66
    ? { label: "Good", ring: "#10b981", text: "text-emerald-700", bg: "bg-emerald-50" }
    : uiScore > 33
    ? { label: "Fair", ring: "#f59e0b", text: "text-amber-700", bg: "bg-amber-50" }
    : { label: "Needs care", ring: "#f43f5e", text: "text-rose-700", bg: "bg-rose-50" };

// The output array is the two task outputs concatenated (standard SD
// concerns, then HD wrinkle). Each task's output ends with its resize_image
// entry, so split on that.
const splitTasks = (output) => {
  const tasks = [];
  let current = [];
  for (const entry of output) {
    current.push(entry);
    if (entry.type === "resize_image") {
      tasks.push(current);
      current = [];
    }
  }
  if (current.length) tasks.push(current);

  return tasks.map((entries, i) => {
    const metrics = entries
      .filter((e) => e.ui_score != null)
      .map((e, j) => ({
        id: `${i}-${j}`,
        type: e.type,
        region: e.region,
        label:
          e.type === "hd_wrinkle"
            ? REGION_LABELS[e.region] || e.region
            : METRIC_LABELS[e.type] || e.type.replace(/_/g, " "),
        uiScore: e.ui_score,
        rawScore: e.raw_score,
        maskUrl: e.mask_urls?.[0],
      }));
    const isHd = metrics.some((m) => m.type.startsWith("hd_"));
    return {
      key: i,
      title: isHd ? "HD wrinkle analysis" : "Standard skin analysis",
      metrics,
      overall: entries.find((e) => e.type === "all")?.score,
      skinAge: entries.find((e) => e.type === "skin_age")?.score,
      imageUrl: entries.find((e) => e.type === "resize_image")?.mask_urls?.[0],
    };
  });
};

const ScoreDial = ({ value, size = 56, light = false }) => {
  const t = tone(value);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? "rgba(255,255,255,0.2)" : "#f1f5f9"} strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={t.ring}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className={`font-display text-[15px] font-bold ${light ? "fill-white" : "fill-slate-800"}`}
      >
        {value}
      </text>
    </svg>
  );
};

const Stat = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold text-slate-900">{value ?? "—"}</p>
    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
  </div>
);

// A face photo with one concern's overlay on top. Masks are transparent
// PNGs the same size as the analysed photo, so they line up exactly.
const OverlayImage = ({ base, mask, alt, showMask = true, className = "" }) => (
  <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
    {base && <img src={base} alt={alt} loading="lazy" className="h-full w-full object-cover" />}
    {mask && showMask && (
      <img src={mask} alt="" loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
    )}
  </div>
);

const ApiAnalysisPanel = ({ scan }) => {
  const output = scan.rawMetrics?.perfectCorpOutput;
  const saved = scan.rawMetrics?.savedImages;
  const tasks = useMemo(() => (output ? splitTasks(output) : []), [output]);
  const allMetrics = tasks.flatMap((t) => t.metrics.map((m) => ({ ...m, task: t })));
  const [selectedId, setSelectedId] = useState(allMetrics[0]?.id);
  const [showMask, setShowMask] = useState(true);

  if (!output?.length) return null;

  // Prefer the copies the server saved at scan time (they don't expire);
  // otherwise use Perfect Corp's signed links while they're still valid.
  const linksValid = Date.now() - new Date(scan.createdAt).getTime() < MASK_TTL_MS;
  const savedMask = (m) => saved?.masks?.find((s) => s.type === m.type && (s.region ?? null) === (m.region ?? null))?.url;
  const maskFor = (m) => savedMask(m) || (linksValid ? m.maskUrl : null);
  const baseImage = saved?.resizeImageUrl || (linksValid ? tasks.find((t) => t.imageUrl)?.imageUrl : null) || scan.imageUrl;
  const overlaysAvailable = allMetrics.some((m) => maskFor(m));

  const selected = allMetrics.find((m) => m.id === selectedId) || allMetrics[0];
  const standard = tasks.find((t) => t.title.startsWith("Standard"));
  const hd = tasks.find((t) => t.title.startsWith("HD"));

  return (
    <section className="border-t border-slate-100 bg-white">
      <div className="container-app py-14">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Cpu size={13} /> Perfect Corp YouCam AI
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-slate-900">Full AI analysis</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Every measurement the AI returned, each shown on your photo with the area it detected. Scores run 0–100,
            where higher means healthier skin. Tap any photo to see it larger.
          </p>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Overall (standard)" value={standard?.overall != null ? Math.round(standard.overall) : null} hint="AI composite score" />
          <Stat label="Overall (HD wrinkle)" value={hd?.overall != null ? Math.round(hd.overall) : null} hint="Wrinkle composite" />
          <Stat label="Skin age" value={standard?.skinAge ?? hd?.skinAge} hint="Estimated by the AI" />
          <Stat label="Measurements" value={allMetrics.length} hint={`${tasks.length} analysis ${tasks.length === 1 ? "task" : "tasks"}`} />
        </div>

        {!overlaysAvailable && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            <ImageOff size={14} className="shrink-0" />
            The AI overlays for this scan have expired (Perfect Corp keeps them for 2 hours). New scans keep them
            permanently.
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Large viewer */}
          {selected && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="relative">
                <OverlayImage
                  base={baseImage}
                  mask={maskFor(selected)}
                  showMask={showMask}
                  alt={`${selected.label} analysis`}
                  className="aspect-square rounded-3xl"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 rounded-b-3xl bg-gradient-to-t from-slate-950/85 to-transparent p-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-white/60">{selected.task.title}</p>
                    <p className="font-display text-xl font-bold text-white">{selected.label}</p>
                  </div>
                  <ScoreDial value={selected.uiScore} size={64} light />
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-400">Score</dt>
                  <dd className="font-display text-lg font-bold text-slate-900">{selected.uiScore}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-400">Raw score</dt>
                  <dd className="font-display text-lg font-bold text-slate-900">
                    {selected.rawScore != null ? selected.rawScore.toFixed(1) : "—"}
                  </dd>
                </div>
                <div className={`rounded-xl p-3 ${tone(selected.uiScore).bg}`}>
                  <dt className="text-[10px] uppercase tracking-wide text-slate-400">Rating</dt>
                  <dd className={`font-display text-lg font-bold ${tone(selected.uiScore).text}`}>{tone(selected.uiScore).label}</dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span className="font-mono">
                  {selected.type}
                  {selected.region ? ` · ${selected.region}` : ""}
                </span>
                {maskFor(selected) && (
                  <button
                    type="button"
                    onClick={() => setShowMask((v) => !v)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    {showMask ? <EyeOff size={14} /> : <Eye size={14} />} {showMask ? "Hide overlay" : "Show overlay"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Photo gallery: one tile per measurement */}
          <div className="space-y-8">
            {tasks.map((task) => (
              <div key={task.key}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="inline-flex items-center gap-2 font-display text-sm font-bold text-slate-800">
                    <Layers size={15} className="text-brand-600" /> {task.title}
                  </h3>
                  <span className="text-xs text-slate-400">{task.metrics.length} measurements</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {task.metrics.map((m) => {
                    const t = tone(m.uiScore);
                    const active = m.id === selected?.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        aria-pressed={active}
                        className={`group overflow-hidden rounded-2xl border bg-white text-left transition ${
                          active ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-100 hover:border-slate-300 hover:shadow-card"
                        }`}
                      >
                        <div className="relative">
                          <OverlayImage base={baseImage} mask={maskFor(m)} alt={`${m.label} analysis`} className="aspect-square" />
                          <span
                            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold shadow ${t.bg} ${t.text}`}
                          >
                            {m.uiScore}
                          </span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800">{m.label}</p>
                            <span className={`shrink-0 text-[11px] font-semibold ${t.text}`}>{t.label}</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full" style={{ width: `${m.uiScore}%`, background: t.ring }} />
                          </div>
                          <p className="mt-1.5 truncate font-mono text-[10px] text-slate-400">
                            raw {m.rawScore != null ? m.rawScore.toFixed(1) : "—"} · {m.type}
                            {m.region ? `·${m.region}` : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default ApiAnalysisPanel;
