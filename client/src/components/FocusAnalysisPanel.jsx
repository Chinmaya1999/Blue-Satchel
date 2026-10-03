import { useState } from "react";
import { Cpu, ImageOff } from "lucide-react";
import { severityTone, titleCase } from "./RupamAnalysisPanel.jsx";

// Shows everything the Focus API returned for a scan (rawMetrics.focusOutput):
// overall score, engine, photo quality, and every metric with its score,
// rating, level, confidence and analysis-mask overlay, plus the raw JSON.
// The same JSON is available from Download → API data (JSON).

// Long base64 overlays make the raw JSON unreadable; shorten them for display only.
const displayJson = (out) =>
  JSON.stringify(
    out,
    (k, v) => (k.endsWith("_base64") && typeof v === "string" ? `<${v.length} base64 chars>` : v),
    2
  );

const FocusAnalysisPanel = ({ scan }) => {
  const out = scan.rawMetrics?.focusOutput;
  const [showRaw, setShowRaw] = useState(false);
  if (!out) return null;

  const metrics = Object.values(out.metrics || {});
  const quality = out.quality || {};

  return (
    <section className="container-app py-12">
      <p className="fs-eyebrow">Focus Scan</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Full analysis response</h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Overall score", out.overall_score],
          ["Engine", out.engine],
          ["Photo quality", quality.score != null ? `${quality.score}/100` : "—"],
          ["Processing", out.processing_ms != null ? `${out.processing_ms} ms` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="card rounded-2xl p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-800">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      {(quality.face_size_px != null || quality.issues?.length > 0) && (
        <p className="mt-3 text-xs text-slate-400">
          Face size: {quality.face_size_px ?? "—"} px · Issues: {quality.issues?.length ? quality.issues.join(", ") : "none"}
        </p>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const tone = severityTone(m.level);
          return (
            <div key={m.key} className="card overflow-hidden rounded-2xl">
              {m.overlay_jpeg_base64 ? (
                <img
                  src={`data:image/jpeg;base64,${m.overlay_jpeg_base64}`}
                  alt={`${m.label} analysis`}
                  className="aspect-square w-full bg-slate-950 object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-slate-400">
                  <ImageOff size={28} />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{m.label || titleCase(m.key)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.bg} ${tone.text}`}>
                    {m.rating || m.level}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                  <dt>Score</dt><dd className="text-right font-semibold text-slate-700">{m.score}</dd>
                  <dt>Concern</dt><dd className="text-right font-semibold text-slate-700">{m.concern}</dd>
                  <dt>Level</dt><dd className="text-right font-semibold capitalize text-slate-700">{m.level}</dd>
                  <dt>Raw</dt><dd className="text-right font-semibold text-slate-700">{m.raw}</dd>
                  <dt>Confidence</dt>
                  <dd className="text-right font-semibold text-slate-700">
                    {typeof m.confidence === "number" ? `${Math.round(m.confidence * 100)}%` : "—"}
                  </dd>
                </dl>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowRaw((v) => !v)} className="btn-secondary mt-8 rounded-full">
        <Cpu size={15} /> {showRaw ? "Hide" : "Show"} raw API response
      </button>
      {showRaw && (
        <pre className="mt-4 max-h-[500px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-relaxed text-emerald-200 ring-1 ring-white/10">
          {displayJson(out)}
        </pre>
      )}
    </section>
  );
};

export default FocusAnalysisPanel;
