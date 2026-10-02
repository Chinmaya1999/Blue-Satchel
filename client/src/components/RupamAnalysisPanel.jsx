import { useState } from "react";
import { Cpu, Eye, EyeOff, ImageOff, Sparkles } from "lucide-react";

// Shows everything Rupam.ai returned for a scan (rawMetrics.rupamOutput):
// the annotated composite overlay, the skin-tone/type profile, every detected
// condition with its grade and detail, and the vendor's suggestions. The raw
// JSON itself is available from Download → API data (JSON).

export const GRADE_TONE = {
  A: { text: "text-emerald-700", bg: "bg-emerald-50", ring: "#10b981" },
  B: { text: "text-lime-700", bg: "bg-lime-50", ring: "#65a30d" },
  C: { text: "text-amber-700", bg: "bg-amber-50", ring: "#f59e0b" },
  D: { text: "text-orange-700", bg: "bg-orange-50", ring: "#f97316" },
  F: { text: "text-rose-700", bg: "bg-rose-50", ring: "#f43f5e" },
};

export const severityTone = (sev) =>
  sev === "none"
    ? GRADE_TONE.A
    : sev === "mild"
    ? GRADE_TONE.B
    : sev === "moderate"
    ? GRADE_TONE.C
    : GRADE_TONE.F;

// Signed S3 composite/image links carry X-Amz-Expires=86400 (24h).
const LINK_TTL_MS = 24 * 60 * 60 * 1000;

export const titleCase = (s) => String(s || "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Everything needed to draw a Rupam scan: the raw output, the annotated
// overlay (the server's saved copy first, since Rupam's signed link expires
// after 24h), the plain photo, and whether the overlay is still available.
export const buildRupamAnalysis = (scan) => {
  const out = scan.rawMetrics?.rupamOutput;
  if (!out) return null;
  const linksValid = Date.now() - new Date(scan.createdAt).getTime() < LINK_TTL_MS;
  return {
    out,
    overlay: scan.rawMetrics?.savedCompositeUrl || (linksValid ? out.annotations?.composite_uri : null),
    baseImage: scan.imageUrl || (linksValid ? out.image_url : null),
    tone: out.skin_profile?.skin_tone || {},
    type: out.skin_profile?.skin_type || {},
    quality: out.image_quality || {},
    conditions: out.conditions || [],
    suggestions: out.suggestions || [],
    meta: out.metadata || {},
  };
};

// Extra per-condition fields Rupam includes (coverage, spot count, …).
export const conditionExtras = (c) => {
  const extras = [];
  if (c.coverage_pct != null) extras.push(`${c.coverage_pct}% coverage`);
  if (c.spot_count != null) extras.push(`${c.spot_count} spots`);
  if (c.detection_count != null && c.condition_id === "acne") extras.push(`${c.detection_count} detected`);
  if (c.puffiness_detected != null) extras.push(c.puffiness_detected ? "puffiness detected" : "no puffiness");
  if (c.confidence != null) extras.push(`${Math.round(c.confidence * 100)}% confidence`);
  return extras;
};

const pct = (n) => `${Math.round(n * 100)}%`;

// Every extra measurement Rupam returns per condition: label/value facts plus
// a per-region breakdown (bars), so nothing in the raw output is hidden.
export const conditionDetails = (c) => {
  const facts = [];
  const add = (label, value) => value != null && value !== "" && facts.push([label, value]);
  add("Detections", c.detection_count);
  add("Dominant depth", c.dominant_depth && titleCase(c.dominant_depth));
  add("Distribution", c.distribution && titleCase(c.distribution));
  add("Coverage", c.coverage_pct != null ? `${c.coverage_pct}%` : null);
  add("Spots", c.spot_count);
  add("Circle type", c.circle_type && titleCase(c.circle_type));
  add("Puffiness", c.puffiness_detected != null ? (c.puffiness_detected ? "Detected" : "None") : null);
  add("Melanin ratio", c.melanin_ratio);
  add("Hemoglobin ratio", c.hemoglobin_ratio);
  add("Oiliness class", c.oiliness_class && titleCase(c.oiliness_class));
  add("Erythema index", c.erythema_index);
  add("Affected area", c.affected_pct != null ? `${c.affected_pct}%` : null);
  add("Roughness index", c.roughness_index);
  add("Confidence", c.confidence != null ? pct(c.confidence) : null);

  // Region breakdown: bar value + label text.
  let regions = [];
  if (Array.isArray(c.regions)) {
    regions = c.regions
      .map((r) => {
        const name = r.region || r.region_name;
        if (r.coverage_pct != null) return { name, value: r.coverage_pct, max: 25, text: `${r.coverage_pct}% coverage` };
        if (r.region_score != null) return { name, value: r.region_score, max: 100, text: `${r.region_score}/100` };
        return null;
      })
      .filter(Boolean);
  }
  const probs = c.probabilities
    ? Object.entries(c.probabilities).map(([k, v]) => ({ name: k, value: v * 100, max: 100, text: pct(v) }))
    : [];
  return { facts, regions, probs };
};

const BarList = ({ title, rows }) =>
  rows.length > 0 && (
    <div className="mt-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="w-24 shrink-0 truncate">{titleCase(r.name)}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.min(100, (r.value / r.max) * 100)}%` }} />
            </div>
            <span className="w-20 shrink-0 text-right text-slate-400">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );

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
  const details = conditionDetails(c);

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
      {details.facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3">
          {details.facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="truncate text-xs font-semibold text-slate-700">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      <BarList title="By region" rows={details.regions} />
      <BarList title="Classification probability" rows={details.probs} />
    </div>
  );
};

const RupamAnalysisPanel = ({ scan }) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const rupam = buildRupamAnalysis(scan);
  if (!rupam) return null;

  const { out, overlay, baseImage, tone, type, quality: q, conditions, suggestions, meta } = rupam;
  const shownImage = (showOverlay && overlay) || baseImage;

  const zoneMap = {};
  for (const sp of conditions.find((c) => c.condition_id === "pigmentation")?.spots || []) {
    const z = (zoneMap[sp.zone] ||= { zone: sp.zone, count: 0, area: 0, depth: sp.depth });
    z.count += 1;
    z.area += sp.area_px || 0;
  }
  const spots = Object.values(zoneMap).sort((a, b) => b.area - a.area);
  const timings = meta.stage_timings_ms || {};

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
            {!overlay && out.annotations?.composite_uri && (
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

            {spots.length > 0 && (
              <>
                <p className="fs-eyebrow mb-3 mt-8 text-[11px]">Pigmentation spots by zone</p>
                <div className="card overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                      <tr><th className="px-4 py-2">Zone</th><th className="px-4 py-2">Spots</th><th className="px-4 py-2">Total area</th><th className="px-4 py-2">Depth</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {spots.map((z) => (
                        <tr key={z.zone}>
                          <td className="px-4 py-2 font-medium">{titleCase(z.zone)}</td>
                          <td className="px-4 py-2">{z.count}</td>
                          <td className="px-4 py-2">{z.area} px</td>
                          <td className="px-4 py-2">{titleCase(z.depth)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

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

        {/* Capture quality + pipeline details */}
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          <div className="card rounded-2xl border border-slate-100 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Photo quality</p>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>Acceptable: <b>{q.is_acceptable == null ? "—" : q.is_acceptable ? "Yes" : "No"}</b></li>
              <li>Face detected: <b>{q.face_detected == null ? "—" : q.face_detected ? "Yes" : "No"}</b></li>
              <li>Sharpness: <b>{q.sharpness_score != null ? pct(q.sharpness_score) : "—"}</b></li>
              <li>Lighting: <b>{q.lighting_score != null ? pct(q.lighting_score) : "—"}</b></li>
            </ul>
          </div>
          <div className="card rounded-2xl border border-slate-100 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Skin profile</p>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>Skin type: <b>{titleCase(type.classification) || "—"}</b>{type.score != null && ` (score ${type.score})`}</li>
              <li>Tone: <b>{tone.category || "—"}</b> · {tone.skin_tone_label}</li>
              <li>Fitzpatrick: <b>{tone.fitzpatrick_estimate ?? "—"}</b>{tone.fitzpatrick_range && ` (range ${tone.fitzpatrick_range.join("–")})`}</li>
              <li>ITA angle: <b>{tone.ita_angle ?? "—"}°</b>{tone.reliable != null && (tone.reliable ? " · reliable" : " · low reliability")}</li>
            </ul>
          </div>
          <div className="card rounded-2xl border border-slate-100 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pipeline</p>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>Request: <span className="break-all font-mono text-[10px]">{out.request_id || "—"}</span></li>
              <li>Processed: <b>{meta.processing_time_ms != null ? `${(meta.processing_time_ms / 1000).toFixed(1)}s` : "—"}</b>{meta.cache_hit && " (cached)"}</li>
              <li>Pipeline: <b>v{meta.pipeline_version || "—"}</b>{meta.model_set && ` · set ${meta.model_set}`}</li>
              {timings.condition_analysis_total != null && <li>Condition analysis: <b>{(timings.condition_analysis_total / 1000).toFixed(1)}s</b></li>}
            </ul>
          </div>
        </div>
        {meta.model_versions && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(meta.model_versions).map(([k, v]) => (
              <span key={k} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                {titleCase(k)} {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RupamAnalysisPanel;
