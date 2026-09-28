import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";

// ---------------------------------------------------------------------------
// A real face photo with a skin-concern stage drawn onto it. Each face lists
// its skin zones in the photo's own pixel coordinates; the SVG viewBox crops
// the photo to the face, so overlays line up at any display size.
// A seeded RNG keeps every stage identical across renders.
// ---------------------------------------------------------------------------

// Overlay sizes (pimple radius, line width, blur…) are tuned for a face crop
// this many units wide; each photo's coordinates are scaled to match.
const DESIGN_WIDTH = 496;

const RAW_FACES = {
  female: {
    src: "/landing/indian-woman.jpg",
    width: 540,
    height: 360,
    crop: [187, 45, 176, 220], // x, y, w, h (4:5)
    zones: [
      { cx: 275, cy: 110, rx: 24, ry: 8 }, // forehead
      { cx: 240, cy: 182, rx: 15, ry: 15 }, // left cheek
      { cx: 309, cy: 181, rx: 15, ry: 15 }, // right cheek
      { cx: 273, cy: 168, rx: 6, ry: 12 }, // nose
      { cx: 275, cy: 228, rx: 16, ry: 8 }, // chin
    ],
    redness: [
      { cx: 240, cy: 182, rx: 20, ry: 17 },
      { cx: 309, cy: 181, rx: 20, ry: 17 },
      { cx: 273, cy: 168, rx: 8, ry: 13 },
    ],
    melasma: [
      { cx: 240, cy: 176, r: 18 },
      { cx: 308, cy: 175, r: 18 },
      { cx: 275, cy: 108, r: 16 },
    ],
    mole: { cx: 310, cy: 190 },
    underEye: [{ x1: 233, x2: 257, y: 155 }, { x1: 291, x2: 315, y: 154 }],
    crowsFeet: [{ x: 227, y: 145, dir: -1 }, { x: 318, y: 143, dir: 1 }],
    folds: [
      [259, 178, 250, 205],
      [287, 178, 300, 205],
    ],
    marionette: [
      [251, 210, 254, 224],
      [299, 210, 296, 224],
    ],
    foreheadLines: [
      { x1: 254, x2: 296, y: 103 },
      { x1: 250, x2: 300, y: 110 },
      { x1: 255, x2: 295, y: 117 },
    ],
  },
  male: {
    src: "/landing/indian-man.jpg",
    width: 624,
    height: 350,
    crop: [212, 20, 200, 250],
    zones: [
      { cx: 314, cy: 88, rx: 38, ry: 14 }, // forehead
      { cx: 272, cy: 164, rx: 13, ry: 10 }, // left cheek (above the beard)
      { cx: 352, cy: 164, rx: 13, ry: 10 }, // right cheek
      { cx: 312, cy: 163, rx: 6, ry: 13 }, // nose
    ],
    redness: [
      { cx: 272, cy: 164, rx: 17, ry: 14 },
      { cx: 352, cy: 164, rx: 17, ry: 14 },
      { cx: 312, cy: 163, rx: 8, ry: 14 },
    ],
    melasma: [
      { cx: 272, cy: 160, r: 15 },
      { cx: 352, cy: 160, r: 15 },
      { cx: 314, cy: 87, r: 20 },
    ],
    mole: { cx: 354, cy: 170 },
    underEye: [{ x1: 263, x2: 290, y: 145 }, { x1: 333, x2: 360, y: 146 }],
    crowsFeet: [{ x: 258, y: 132, dir: -1 }, { x: 364, y: 134, dir: 1 }],
    folds: [
      [295, 180, 283, 205],
      [331, 180, 343, 205],
    ],
    marionette: [], // under the beard
    foreheadLines: [
      { x1: 280, x2: 348, y: 78 },
      { x1: 275, x2: 353, y: 88 },
      { x1: 282, x2: 346, y: 98 },
    ],
  },
};

// Scales every coordinate of a face into design units.
const toDesignUnits = (face) => {
  const k = DESIGN_WIDTH / face.crop[2];
  const pt = (o) => Object.fromEntries(Object.entries(o).map(([key, v]) => [key, key === "dir" ? v : v * k]));
  return {
    src: face.src,
    width: face.width * k,
    height: face.height * k,
    crop: face.crop.map((v) => v * k),
    zones: face.zones.map(pt),
    redness: face.redness.map(pt),
    melasma: face.melasma.map(pt),
    mole: pt(face.mole),
    underEye: face.underEye.map(pt),
    crowsFeet: face.crowsFeet.map(pt),
    folds: face.folds.map((seg) => seg.map((v) => v * k)),
    marionette: face.marionette.map((seg) => seg.map((v) => v * k)),
    foreheadLines: face.foreheadLines.map(pt),
  };
};

const FACES = Object.fromEntries(Object.entries(RAW_FACES).map(([key, face]) => [key, toDesignUnits(face)]));

const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Uniform random points inside the face's skin zones, weighted by zone area.
const inZones = (rand, zones, n) => {
  const areas = zones.map((z) => z.rx * z.ry);
  const total = areas.reduce((a, b) => a + b, 0);
  return Array.from({ length: n }, () => {
    let pick = rand() * total;
    const z = zones.find((_, i) => (pick -= areas[i]) <= 0) || zones[0];
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    return [z.cx + Math.cos(a) * z.rx * d, z.cy + Math.sin(a) * z.ry * d];
  });
};

const blob = (rand, cx, cy, r, wobble = 0.45, n = 12) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const d = r * (1 - wobble / 2 + rand() * wobble);
    return `${(cx + Math.cos(a) * d).toFixed(1)},${(cy + Math.sin(a) * d).toFixed(1)}`;
  }).join(" ");

const FaceStage = ({ gender = "female", f = {}, seed = 1, className = "" }) => {
  const face = FACES[gender];
  const uid = useId().replace(/:/g, "");
  const s = useMemo(() => {
    const r = rng(seed);
    const lines = f.lines || 0;
    const deep = f.deepLines || 0;
    return {
      blackheads: inZones(r, face.zones, f.blackheads || 0),
      whiteheads: inZones(r, face.zones, f.whiteheads || 0),
      papules: inZones(r, face.zones, f.papules || 0),
      cysts: inZones(r, face.zones, f.cysts || 0),
      scars: inZones(r, face.zones, f.scars || 0),
      marks: inZones(r, face.zones, f.marks || 0),
      spots: inZones(r, face.zones, f.spots || 0).map((p) => [...p, 5 + r() * 6]),
      melasma: f.melasma ? face.melasma.map((m) => blob(r, m.cx, m.cy, m.r * (0.8 + f.melasma * 0.4))) : [],
      // Fine lines: crow's feet first, then under-eye, then forehead.
      crows: lines ? face.crowsFeet.flatMap(({ x, y, dir }) =>
        Array.from({ length: Math.min(3, Math.ceil(lines / 2)) }, (_, i) => {
          const ang = ((i - 1) * 22 * Math.PI) / 180;
          const len = 26 + r() * 10;
          return `M${x},${y} q${dir * len * 0.5},${-6 + i * 6} ${dir * len * Math.cos(ang)},${len * Math.sin(ang)}`;
        })) : [],
      underEye: lines >= 4 ? face.underEye.map(({ x1, x2, y }) => `M${x1},${y} Q${(x1 + x2) / 2},${y + 9} ${x2},${y}`) : [],
      forehead: face.foreheadLines.slice(0, lines >= 3 ? Math.ceil(lines / 2) : 0).map(({ x1, x2, y }) => {
        const w = x2 - x1;
        return `M${x1},${y + 3} C${x1 + w * 0.25},${y - 6} ${x1 + w * 0.4},${y + 4} ${x1 + w * 0.55},${y - 2} S${x2 - w * 0.1},${y - 5} ${x2},${y + 2}`;
      }),
      // Bulge away from the face's midline, like a real nasolabial fold.
      folds: deep ? face.folds.map(([a, b, c, d]) => `M${a},${b} Q${(a + c) / 2 + (c < a ? -10 : 10)},${(b + d) / 2 - 8} ${c},${d}`) : [],
      marionette: deep >= 3 ? face.marionette.map(([a, b, c, d]) => `M${a},${b} L${c},${d}`) : [],
      deepForehead: deep >= 3 ? face.foreheadLines.map(({ x1, x2, y }) => `M${x1 + 10},${y + 2} Q${(x1 + x2) / 2},${y - 7} ${x2 - 10},${y + 2}`) : [],
    };
  }, [face, f, seed]);

  const [cx, cy, cw, ch] = face.crop;
  const soft = `url(#soft${uid})`;
  const wide = `url(#wide${uid})`;

  return (
    <svg viewBox={`${cx} ${cy} ${cw} ${ch}`} className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`pap${uid}`}>
          <stop offset="0" stopColor="#b8322d" />
          <stop offset="0.55" stopColor="#cf5a50" stopOpacity="0.85" />
          <stop offset="1" stopColor="#cf5a50" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`cyst${uid}`}>
          <stop offset="0" stopColor="#7a1d20" />
          <stop offset="0.5" stopColor="#a33936" stopOpacity="0.85" />
          <stop offset="1" stopColor="#bf4e47" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={`wide${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={`fine${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      <image href={face.src} x="0" y="0" width={face.width} height={face.height} />

      <g style={{ mixBlendMode: "multiply" }}>
        {f.redness > 0 &&
          face.redness.map((z, i) => (
            <ellipse key={i} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="#e0564c" opacity={f.redness * 0.7} filter={wide} />
          ))}
        {s.melasma.map((pts, i) => (
          <polygon key={i} points={pts} fill="#8a5232" opacity={0.4 + f.melasma * 0.3} filter={wide} />
        ))}
        {s.marks.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8" fill="#94503a" opacity="0.55" filter={soft} />
        ))}
        {s.spots.map(([x, y, rad], i) => (
          <circle key={i} cx={x} cy={y} r={rad} fill="#7e4a2e" opacity="0.6" filter={soft} />
        ))}
        {[...s.crows, ...s.underEye, ...s.forehead].map((d, i) => (
          <path key={i} d={d} stroke="#6b3a28" strokeOpacity="0.55" strokeWidth="2" fill="none" strokeLinecap="round" filter={`url(#fine${uid})`} />
        ))}
        {/* Folds: soft shadow only — a hard line reads as drawn-on. */}
        {[...s.folds, ...s.marionette].map((d, i) => (
          <path key={i} d={d} stroke="#5a2e1e" strokeOpacity="0.3" strokeWidth="16" fill="none" strokeLinecap="round" filter={soft} />
        ))}
        {s.deepForehead.map((d, i) => (
          <g key={i}>
            <path d={d} stroke="#5a2e1e" strokeOpacity="0.38" strokeWidth="10" fill="none" strokeLinecap="round" filter={soft} />
            <path d={d} stroke="#4a2417" strokeOpacity="0.5" strokeWidth="2" fill="none" strokeLinecap="round" filter={`url(#fine${uid})`} />
          </g>
        ))}
        {s.scars.map(([x, y], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="7" ry="5.5" fill="#8f5a40" opacity="0.8" />
            <ellipse cx={x + 1.5} cy={y + 2} rx="4" ry="3" fill="#5e3222" opacity="0.7" />
          </g>
        ))}
        {s.blackheads.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill="#2e1d15" />
        ))}
      </g>

      {[...s.folds, ...s.marionette].map((d, i) => (
        <path key={i} d={d} transform={`translate(${i % 2 ? 5 : -5} 0)`} stroke="#f4d2b6" strokeOpacity="0.22" strokeWidth="5" fill="none" strokeLinecap="round" filter={soft} />
      ))}
      {s.papules.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="11" fill={`url(#pap${uid})`} />
      ))}
      {s.whiteheads.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill={`url(#pap${uid})`} />
          <circle cx={x} cy={y} r="3.2" fill="#fbeedd" />
        </g>
      ))}
      {s.cysts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="20" fill={`url(#cyst${uid})`} />
          <ellipse cx={x - 4} cy={y - 5} rx="5" ry="3" fill="#fff" opacity="0.25" />
        </g>
      ))}
      {f.mole && (
        <g>
          <polygon points={blob(rng(seed + 5), face.mole.cx, face.mole.cy, 16, 0.55, 18)} fill="#2f1810" filter={`url(#fine${uid})`} />
          <polygon points={blob(rng(seed + 9), face.mole.cx + 5, face.mole.cy + 3, 9, 0.6, 14)} fill="#7a3a22" opacity="0.8" filter={`url(#fine${uid})`} />
        </g>
      )}
      {f.dull > 0 && <rect x={cx} y={cy} width={cw} height={ch} fill="#8a8a8a" opacity={f.dull * 0.3} style={{ mixBlendMode: "saturation" }} />}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const CONCERNS = [
  {
    key: "acne",
    label: "Acne",
    stages: [
      { f: { whiteheads: 2, blackheads: 4 }, label: "Occasional breakouts", ok: true },
      { f: { blackheads: 18, whiteheads: 5 }, label: "Blackheads & whiteheads", ok: true },
      { f: { papules: 6, whiteheads: 4, blackheads: 6, redness: 0.3 }, label: "Mild inflamed pimples", ok: true },
      { f: { papules: 12, whiteheads: 6, marks: 6, redness: 0.5 }, label: "Moderate acne with marks", ok: true },
      { f: { cysts: 5, papules: 8, redness: 0.8 }, label: "Painful cysts & nodules", ok: false },
      { f: { scars: 22, marks: 4 }, label: "Deep, pitted acne scars", ok: false },
    ],
    timeline: [
      { when: "Week 2", text: "Skin feels calmer and less oily", f: { papules: 9, whiteheads: 5, marks: 6, redness: 0.45 } },
      { when: "Week 4", text: "Fewer new breakouts", f: { papules: 5, whiteheads: 3, marks: 6, redness: 0.3 } },
      { when: "Week 8", text: "Active pimples clear faster", f: { papules: 2, whiteheads: 1, marks: 6, redness: 0.15 } },
      { when: "Week 12", text: "Clearer skin, marks begin to fade", f: { papules: 1, marks: 4 } },
      { when: "Month 6", text: "Marks visibly lighter, rare flare-ups", f: { marks: 2 } },
      { when: "Ongoing", text: "Maintain clear, balanced skin", f: {} },
    ],
  },
  {
    key: "pigmentation",
    label: "Pigmentation",
    stages: [
      { f: { dull: 0.7 }, label: "Dull, uneven tone", ok: true },
      { f: { spots: 7 }, label: "Light sun spots", ok: true },
      { f: { marks: 12 }, label: "Post-acne dark marks", ok: true },
      { f: { spots: 12, melasma: 0.2 }, label: "Visible patches & spots", ok: true },
      { f: { melasma: 1 }, label: "Deep, widespread melasma", ok: false },
      { f: { mole: true }, label: "New or changing mole", ok: false },
    ],
    timeline: [
      { when: "Week 2", text: "Brighter, more hydrated look", f: { spots: 12, melasma: 0.2, dull: 0.5 } },
      { when: "Week 4", text: "Dullness lifts, tone evens out", f: { spots: 12, melasma: 0.15 } },
      { when: "Week 8", text: "Dark spots start to lighten", f: { spots: 8, melasma: 0.1 } },
      { when: "Week 12", text: "Visibly fewer dark spots", f: { spots: 5 } },
      { when: "Month 6", text: "A more even tone overall", f: { spots: 2 } },
      { when: "Ongoing", text: "Daily SPF keeps spots from returning", f: {} },
    ],
  },
  {
    key: "aging",
    label: "Fine lines & aging",
    stages: [
      { f: { lines: 2, dull: 0.3 }, label: "Dehydration lines", ok: true },
      { f: { lines: 4 }, label: "Fine lines", ok: true },
      { f: { lines: 6, spots: 3 }, label: "Early crow's feet", ok: true },
      { f: { lines: 6, deepLines: 1 }, label: "Loss of firmness", ok: true },
      { f: { lines: 6, deepLines: 3 }, label: "Deep, set-in wrinkles", ok: false },
      { f: { deepLines: 3, lines: 6, spots: 5, dull: 0.4 }, label: "Significant sagging", ok: false },
    ],
    timeline: [
      { when: "Week 2", text: "Plumper, hydrated skin", f: { lines: 6, deepLines: 1, dull: 0.3 } },
      { when: "Week 4", text: "Smoother-feeling texture", f: { lines: 6, deepLines: 1 } },
      { when: "Week 8", text: "Fine lines look softer", f: { lines: 5, deepLines: 1 } },
      { when: "Week 12", text: "Firmer, bouncier-looking skin", f: { lines: 4 } },
      { when: "Month 6", text: "Visible reduction in fine lines", f: { lines: 2 } },
      { when: "Ongoing", text: "Maintain and protect with SPF", f: { lines: 1 } },
    ],
  },
];

const GENDERS = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
];

const Tabs = ({ options, value, onChange }) => (
  <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/10">
    {options.map((o) => (
      <button
        key={o.key}
        onClick={() => onChange(o.key)}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          value === o.key ? "bg-cyan-300 text-slate-950 shadow-[0_0_20px_-4px_rgba(94,231,255,0.7)]" : "text-slate-400 hover:text-white"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const SkinExpectations = () => {
  const [gender, setGender] = useState("female");
  const [stageTab, setStageTab] = useState("acne");
  const [timeTab, setTimeTab] = useState("acne");
  const stages = CONCERNS.find((c) => c.key === stageTab);
  const timeline = CONCERNS.find((c) => c.key === timeTab);

  return (
    <>
      {/* ───────── Honest expectations ───────── */}
      <section className="border-t border-white/5 py-24 sm:py-32">
        <div className="container-app">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="fs-eyebrow">Honest expectations</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">Who will really see results?</h2>
              <p className="mt-4 max-w-2xl text-slate-400">
                A good routine works wonders for everyday concerns. Some conditions need a dermatologist — and we'll tell you
                when yours does.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tabs options={GENDERS} value={gender} onChange={setGender} />
              <Tabs options={CONCERNS} value={stageTab} onChange={setStageTab} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.ul key={`${gender}-${stageTab}`} {...fade} className="mt-12 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {stages.stages.map((s, i) => (
                <li key={s.label} className="text-center">
                  <div className="relative">
                    <FaceStage
                      gender={gender}
                      f={s.f}
                      seed={i * 7 + stageTab.length}
                      className={`aspect-[4/5] w-full rounded-3xl bg-slate-900 ring-1 ring-white/10 ${s.ok ? "" : "grayscale"}`}
                    />
                    <span
                      className={`absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-[#050814] ${
                        s.ok ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {s.ok ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Stage {i + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{s.label}</p>
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={12} strokeWidth={3} /></span>
              A consistent routine can visibly improve this
            </span>
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white"><X size={12} strokeWidth={3} /></span>
              See a dermatologist — your scan report lists clinics near you
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-600">Illustrative stages — concerns are simulated on model photos.</p>
        </div>
      </section>

      {/* ───────── When will you see results? ───────── */}
      <section className="container-app pb-24 sm:pb-32">
        <div className="rounded-[2rem] bg-white/[0.03] p-6 ring-1 ring-white/10 sm:p-10">
          <div className="flex flex-wrap gap-2">
            <Tabs options={GENDERS} value={gender} onChange={setGender} />
            <Tabs options={CONCERNS} value={timeTab} onChange={setTimeTab} />
          </div>
          <h2 className="mt-8 font-display text-3xl font-bold text-white sm:text-5xl">When will you see results?</h2>

          <AnimatePresence mode="wait">
            <motion.ol key={`${gender}-${timeTab}`} {...fade} className="relative mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              {/* connecting line (desktop) */}
              <span className="absolute left-0 right-0 top-[7.9rem] hidden h-px bg-gradient-to-r from-cyan-300/60 via-cyan-300/30 to-transparent lg:block" />
              {timeline.timeline.map((t, i) => (
                <li key={t.when} className="relative">
                  <FaceStage gender={gender} f={t.f} seed={i * 11 + 3} className="h-28 w-[5.6rem] rounded-2xl bg-slate-900 ring-1 ring-white/10" />
                  <span className="relative z-10 mt-3 block h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(94,231,255,0.8)]" />
                  <p className="mt-4 font-display text-lg font-bold text-cyan-200">{t.when}</p>
                  <p className="mt-1 text-sm text-slate-300">{t.text}</p>
                </li>
              ))}
            </motion.ol>
          </AnimatePresence>

          <p className="mt-10 text-xs text-slate-500">
            *Typical timelines with daily use and daily sunscreen — they vary with skin type, severity and consistency. Rescan
            every couple of weeks to track your own progress.
          </p>
        </div>
      </section>
    </>
  );
};

export default SkinExpectations;
