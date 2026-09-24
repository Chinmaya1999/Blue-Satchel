import { createPortal } from "react-dom";
import { Briefcase } from "lucide-react";
import { buildAiAnalysis, OverlayImage, tone } from "./ApiAnalysisPanel.jsx";

// Print-only A4 report for a scan. Rendered through a portal straight into
// <body>, next to #root, so the print stylesheet in index.css can hide the
// whole app and print just this. It stays display:none on screen.

const LEVEL_COLOR = {
  Low: { bar: "#10b981", text: "#047857", bg: "#ecfdf5" },
  Medium: { bar: "#f59e0b", text: "#b45309", bg: "#fffbeb" },
  High: { bar: "#f43f5e", text: "#be123c", bg: "#fff1f2" },
};

const SOURCE_LABEL = {
  perfectcorp: "Perfect Corp YouCam AI Skin Analysis (live)",
  mock: "Demo data (not a real analysis)",
};

const LevelPill = ({ level }) => {
  const c = LEVEL_COLOR[level] || LEVEL_COLOR.Low;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: c.text, background: c.bg }}>
      {level}
    </span>
  );
};

const ScanReport = ({ scan, user, insight }) => {
  const skinAge = scan.rawMetrics?.skinAge;
  const created = new Date(scan.createdAt);
  const topConcerns = [...scan.concerns].sort((a, b) => b.severity - a.severity).slice(0, 3);
  const ai = buildAiAnalysis(scan);

  return createPortal(
    <div className="print-report bg-white font-sans text-slate-900">
      {/* Header */}
      <header className="flex items-start justify-between border-b-2 border-brand-600 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Briefcase size={18} strokeWidth={2.4} />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-tight text-brand-900">Blue Satchel</p>
            <p className="text-[11px] text-slate-500">AI Skin Analysis Report</p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-right text-[11px]">
          <dt className="text-slate-400">Name</dt>
          <dd className="font-semibold">{user?.name || "—"}</dd>
          <dt className="text-slate-400">Date</dt>
          <dd className="font-semibold">{created.toLocaleString()}</dd>
          <dt className="text-slate-400">Report ID</dt>
          <dd className="font-mono">{scan._id}</dd>
        </dl>
      </header>

      {/* Summary */}
      <section className="report-block mt-5 flex gap-5">
        {scan.imageUrl && (
          <img src={scan.imageUrl} alt="" className="h-44 w-44 shrink-0 rounded-xl object-cover" />
        )}
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex items-end gap-4">
            <p className="font-display text-6xl font-extrabold leading-none text-brand-700">{scan.overallScore}</p>
            <div className="pb-1">
              <p className="text-xs text-slate-400">out of 100</p>
              <p className="font-display text-xl font-bold">{scan.overallLabel}</p>
            </div>
            {skinAge != null && (
              <div className="ml-auto rounded-xl bg-brand-50 px-4 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-brand-700">Estimated skin age</p>
                <p className="font-display text-2xl font-bold text-brand-900">{Math.round(skinAge)}</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{insight}</p>
          <div className="mt-3 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Top concerns: </span>
            {topConcerns.map((c) => `${c.label} (${c.severity})`).join(" · ")}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Data source: </span>
            {SOURCE_LABEL[scan.provider] || scan.provider}
          </p>
        </div>
      </section>

      {/* Concerns table */}
      <section className="report-block mt-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-500">Skin concerns</h2>
        <p className="text-[10px] text-slate-400">Severity 0–100, where higher means the concern is more visible.</p>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-400">
              <th className="py-1.5 font-semibold">Concern</th>
              <th className="py-1.5 font-semibold">Severity</th>
              <th className="w-10 py-1.5 text-right font-semibold">Score</th>
              <th className="w-20 py-1.5 text-right font-semibold">Level</th>
            </tr>
          </thead>
          <tbody>
            {scan.concerns.map((c) => {
              const color = (LEVEL_COLOR[c.level] || LEVEL_COLOR.Low).bar;
              return (
                <tr key={c.key} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-medium">{c.label}</td>
                  <td className="w-1/2 py-1.5 pr-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${c.severity}%`, background: color }} />
                    </div>
                  </td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{c.severity}</td>
                  <td className="py-1.5 text-right">
                    <LevelPill level={c.level} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Wrinkle regions */}
      {scan.faceRegions?.length > 0 && (
        <section className="report-block mt-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-500">Wrinkles by face region</h2>
          <p className="text-[10px] text-slate-400">Region health score out of 10, where higher is better.</p>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {scan.faceRegions.map((r) => (
              <div key={r.key} className="rounded-lg border border-slate-200 p-2 text-center">
                <p className="font-display text-lg font-bold">{((100 - r.severity) / 10).toFixed(1)}</p>
                <p className="text-[10px] text-slate-500">{r.label}</p>
                <div className="mt-1">
                  <LevelPill level={r.level} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended products */}
      {scan.recommendedProducts?.length > 0 && (
        <section className="report-block mt-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-500">Recommended routine</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {scan.recommendedProducts.map((p) => (
              <li key={p._id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                {p.imageUrl && <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{p.name}</p>
                  <p className="text-[10px] text-slate-500">{p.brand}</p>
                </div>
                <p className="text-xs font-bold">₹{p.price}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Full AI analysis: every measurement on the photo with its overlay */}
      {ai.tasks.length > 0 && (
        <section className="report-page-break">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-500">Full AI analysis</h2>
          <p className="text-[10px] text-slate-400">
            Every measurement Perfect Corp's AI returned, drawn on your photo over the area it detected. Scores run
            0–100, where higher means healthier skin.
            {ai.standard?.skinAge != null && ` Estimated skin age: ${ai.standard.skinAge}.`}
          </p>
          {!ai.overlaysAvailable && (
            <p className="mt-1 text-[10px] text-amber-700">
              The overlays for this scan have expired, so the photos are shown without them.
            </p>
          )}
          {ai.tasks.map((task) => (
            <div key={task.key} className="mt-4">
              <div className="report-block flex items-baseline justify-between border-b border-slate-200 pb-1">
                <h3 className="font-display text-xs font-bold text-slate-800">{task.title}</h3>
                <span className="text-[10px] text-slate-400">
                  {task.overall != null && `Composite ${Math.round(task.overall)} · `}
                  {task.metrics.length} measurements
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {task.metrics.map((m) => {
                  const t = tone(m.uiScore);
                  return (
                    <div key={m.id} className="report-block overflow-hidden rounded-lg border border-slate-200">
                      <OverlayImage
                        base={ai.baseImage}
                        mask={ai.maskFor(m)}
                        alt={`${m.label} analysis`}
                        lazy={false}
                        className="aspect-square"
                      />
                      <div className="px-2 py-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-[11px] font-semibold">{m.label}</p>
                          <p className="shrink-0 text-[11px] font-bold tabular-nums">{m.uiScore}</p>
                        </div>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${m.uiScore}%`, background: t.ring }} />
                        </div>
                        <p className="mt-1 flex justify-between text-[9px] text-slate-400">
                          <span>raw {m.rawScore != null ? m.rawScore.toFixed(1) : "—"}</span>
                          <span className={`font-semibold ${t.text}`}>{t.label}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      <footer className="report-block mt-8 border-t border-slate-200 pt-3 text-[9px] leading-relaxed text-slate-400">
        This report is generated by an AI analysis of your photo and is for cosmetic guidance only. It is not a medical
        diagnosis. See a dermatologist for any skin condition that worries you. © {created.getFullYear()} Blue Satchel.
      </footer>
    </div>,
    document.body
  );
};

export default ScanReport;
