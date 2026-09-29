import { useState } from "react";
import { Cpu, Eye, EyeOff, ImageOff, Sparkles } from "lucide-react";

// Shows everything Rupam.ai returned for a scan (rawMetrics.rupamOutput):
// the annotated composite overlay, the skin-tone/type profile, every detected
// condition with its grade and detail, and the vendor's suggestions. The raw
// JSON itself is available from Download → API data (JSON).

const GRADE_TONE = {
  A: { text: "text-emerald-700", bg: "bg-emerald-50", ring: "#10b981" },
  B: { text: "text-lime-700", bg: "bg-lime-50", ring: "#65a30d" },
  C: { text: "text-amber-700", bg: "bg-amber-50", ring: "#f59e0b" },
  D: { text: "text-orange-700", bg: "bg-orange-50", ring: "#f97316" },
  F: { text: "text-rose-700", bg: "bg-rose-50", ring: "#f43f5e" },
};

const severityTone = (sev) =>
  sev === "none"
    ? GRADE_TONE.A
    : sev === "mild"
    ? GRADE_TONE.B
    : sev === "moderate"
    ? GRADE_TONE.C
    : GRADE_TONE.F;

// Signed S3 composite/image links carry X-Amz-Expires=86400 (24h).
const LINK_TTL_MS = 24 * 60 * 60 * 1000;

const titleCase = (s) => String(s || "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Stat = ({ label, value, hint }) => (
  <div className="card rounded-2xl border border-slate-100 p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold text-slate-900">{value ?? "—"}</p>
    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
  </div>
);

// One condition's detail: name, letter grade, severity, score, and whichever
// extra fields Rupam included for it (coverage, spot count, region hotspots…).
const ConditionCard = ({ c }) => {
  const grade = GRADE_TONE[c.grade] || GRADE_TONE.C;
  const extras = [];
  if (c.coverage_pct != null) extras.push(`${c.coverage_pct}% coverage`);
  if (c.spot_count != null) extras.push(`${c.spot_count} spots`);
  if (c.detection_count != null && c.condition_id === "acne") extras.push(`${c.detection_count} detected`);
  if (c.puffiness_detected != null) extras.push(c.puffiness_detected ? "puffiness detected" : "no puffiness");
  if (c.confidence != null) extras.push(`${Math.round(c.confidence * 100)}% confidence`);

  return (
    <div className="card rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{c.condition_name || titleCase(c.condition_id)}</p>
          <p className={`mt-0.5 text-xs font-semibold ${severityTone(c.severity).text}`}>{titleCase(c.severity)}</p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${grade.bg} ${grade.text}`}
        >
          {c.grade || "–"}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${c.score ?? 0}%`, background: grade.ring }} />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Health score {c.score}/100</p>
      {extras.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {extras.map((e) => (
            <span key={e} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const RupamAnalysisPanel = ({ scan }) => {
  const out = scan.rawMetrics?.rupamOutput;
  const [showOverlay, setShowOverlay] = useState(true);
  if (!out) return null;

  const linksValid = Date.now() - new Date(scan.createdAt).getTime() < LINK_TTL_MS;
  const overlay = scan.rawMetrics?.savedCompositeUrl || (linksValid ? out.annotations?.composite_uri : null);
  const baseImage = scan.imageUrl || (linksValid ? out.image_url : null);
  const shownImage = (showOverlay && overlay) || baseImage;

  const tone = out.skin_profile?.skin_tone || {};
  const type = out.skin_profile?.skin_type || {};
  const q = out.image_quality || {};
  const conditions = out.conditions || [];
  const suggestions = out.suggestions || [];
  const meta = out.metadata || {};

  return (
    <section className="border-t border-slate-100">
      <div className="container-app py-16">
        <div>
          <p className="fs-eyebrow inline-flex items-center gap-1.5">
            <Cpu size={13} /> Rupam.ai AI
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Full AI analysis
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Everything Rupam returned for this scan — the annotated photo, your skin profile, every detected condition,
            and its suggestions. Condition scores run 0–100, where higher means healthier skin.
          </p>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Overall score" value={out.overall_skin_health_score} hint="Rupam composite" />
          <Stat label="Skin type" value={titleCase(type.classification)} hint={type.confidence != null ? `${Math.round(type.confidence * 100)}% confidence` : null} />
          <Stat label="Fitzpatrick" value={tone.fitzpatrick_estimate != null ? `F${tone.fitzpatrick_estimate}` : null} hint={tone.skin_tone_label} />
          <Stat label="Skin tone" value={tone.category} hint={tone.ita_angle != null ? `ITA ${tone.ita_angle}°` : null} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Annotated photo */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {shownImage ? (
              <div className="relative overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-slate-200">
                <img src={shownImage} alt="Rupam analysis" className="h-full w-full object-cover" />
                {overlay && (
                  <button
                    onClick={() => setShowOverlay((v) => !v)}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/75"
                  >
                    {showOverlay ? <EyeOff size={13} /> : <Eye size={13} />} {showOverlay ? "Hide" : "Show"} overlay
                  </button>
                )}
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-3xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                <ImageOff size={22} />
              </div>
            )}
            {overlay && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Detected spots and zones marked on your photo by Rupam.
              </p>
            )}
            {!scan.rawMetrics?.savedCompositeUrl && !linksValid && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                <ImageOff size={14} className="shrink-0" />
                Rupam's annotated overlay for this scan has expired. New scans keep it permanently.
              </p>
            )}
          </div>

          {/* Conditions + suggestions */}
          <div>
            <p className="fs-eyebrow mb-3 text-[11px]">Detected conditions</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {conditions.map((c) => (
                <ConditionCard key={c.condition_id} c={c} />
              ))}
            </div>

            {suggestions.length > 0 && (
              <>
                <p className="fs-eyebrow mb-3 mt-8 text-[11px]">Suggestions</p>
                <div className="space-y-2.5">
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <Sparkles size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700">{s.text}</p>
                        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {titleCase(s.related_conditions?.[0] || s.condition_id)}
                          {s.priority ? ` · ${s.priority} priority` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footnote: capture quality + pipeline meta */}
        <p className="mt-8 text-xs text-slate-400">
          {q.sharpness_score != null && `Sharpness ${Math.round(q.sharpness_score * 100)}% · `}
          {q.lighting_score != null && `Lighting ${Math.round(q.lighting_score * 100)}% · `}
          {meta.processing_time_ms != null && `Processed in ${(meta.processing_time_ms / 1000).toFixed(1)}s · `}
          {meta.pipeline_version && `Pipeline v${meta.pipeline_version}`}
          {meta.model_set ? ` · Model set ${meta.model_set}` : ""}
        </p>
      </div>
    </section>
  );
};

export default RupamAnalysisPanel;
