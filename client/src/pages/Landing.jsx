import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanFace, ArrowRight, ShieldCheck, Cpu, Sparkles, Camera, Layers, Activity, ShoppingBag } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import FaceScan3D from "../components/landing/FaceScan3D.jsx";
import SkinLayers3D from "../components/landing/SkinLayers3D.jsx";
import LiveLandmarks from "../components/landing/LiveLandmarks.jsx";

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

const HERO_CALLOUTS = [
  { at: "forehead", label: "T-zone oil", value: "Balanced · 72", side: "right", len: 90 },
  { at: "underEyeL", label: "Dark circles", value: "Mild · 34", side: "left", len: 90 },
  { at: "cheekR", label: "Redness", value: "Low · 18", side: "right", len: 80 },
  { at: "chin", label: "Blemishes", value: "2 detected", side: "left", len: 100 },
];

const STAGES = [
  {
    preset: "capture",
    icon: Camera,
    tag: "01 · Capture",
    title: "A single selfie, scanned line by line",
    body: "Your camera frame is checked for light, focus and angle, then swept pixel-row by pixel-row. Poor lighting? We tell you before the analysis — not after.",
    stats: [["Light check", "Auto"], ["Frame", "1 photo"]],
  },
  {
    preset: "landmarks",
    icon: ScanFace,
    tag: "02 · Landmarks",
    title: "Thousands of points lock onto your features",
    body: "Eyes, brows, nose, lips and jawline are located precisely so every measurement lands on the same spot of your face — scan after scan.",
    stats: [["Key landmarks", "68"], ["Alignment", "Sub-pixel"]],
    callouts: [
      { at: "eyeR", label: "Eye corner", value: "Locked", side: "right", len: 80 },
      { at: "noseTip", label: "Nose tip", value: "Anchor", side: "left", len: 90 },
      { at: "mouthR", label: "Lip line", value: "Tracked", side: "right", len: 80 },
    ],
  },
  {
    preset: "mesh",
    icon: Layers,
    tag: "03 · Face mesh",
    title: "A 3D mesh maps the shape of your skin",
    body: "The landmarks drive a dense surface mesh. It separates forehead, T-zone, cheeks, under-eyes and chin so each area is judged on its own terms.",
    stats: [["Skin zones", "7"], ["Surface", "3D"]],
  },
  {
    preset: "heat",
    icon: Activity,
    tag: "04 · Concern mapping",
    title: "Every concern gets its own heat-map",
    body: "Oil, redness, dark circles, pores, spots and texture are scored per zone. You see exactly where each concern sits — not just a vague overall number.",
    legend: [
      ["#ffb82e", "Oil / shine"],
      ["#ff3b54", "Redness"],
      ["#9466ff", "Dark circles"],
      ["#33ffbf", "Blemishes"],
    ],
  },
  {
    preset: "result",
    icon: Sparkles,
    tag: "05 · Your report",
    title: "One score. A routine built around it.",
    body: "All zones roll up into a skin-health score with a clear breakdown, then we match products to your top concerns — ready to add to your bag.",
    stats: [["Time to results", "< 60s"], ["Routine", "Personal"]],
    callouts: [
      { at: "forehead", label: "Skin score", value: "86 / 100", side: "right", len: 90 },
      { at: "cheekL", label: "Focus", value: "Redness", side: "left", len: 90 },
    ],
  },
];

// Concern explorer markers are in % of the cropped face frame (freckles.jpg, 900×600, crop x 270–650, y 80–460).
const CONCERNS = [
  {
    id: "spots",
    label: "Spots",
    color: "#ffb44d",
    score: 38,
    text: "Freckles, sun spots and post-blemish marks are measured by count, size and contrast against your base tone.",
    marks: [[40, 53, 3], [44, 57, 2.5], [56, 56, 3], [60, 52, 2.5], [46, 50, 2], [54, 49, 2], [64, 58, 3], [36, 57, 2.5], [51, 60, 2]],
  },
  {
    id: "pores",
    label: "Pores",
    color: "#5ee7ff",
    score: 44,
    text: "Enlarged pores cluster around the nose and inner cheeks. We size them from fine surface shadows.",
    marks: [[48, 55, 2], [53, 55, 2], [45, 58, 2.5], [56, 58, 2.5], [41, 61, 2], [60, 61, 2], [50, 51, 1.8]],
  },
  {
    id: "redness",
    label: "Redness",
    color: "#ff4d6d",
    score: 22,
    text: "Diffuse redness and flushing are isolated from your natural tone — usually strongest on cheeks and around the nose.",
    marks: [[31, 60, 9], [68, 60, 9], [50, 57, 4]],
  },
  {
    id: "dark",
    label: "Dark circles",
    color: "#a07bff",
    score: 30,
    text: "Under-eye darkness is compared with your cheek tone to separate shadowing from pigmentation.",
    marks: [[37, 48, 6], [63, 48, 6]],
  },
  {
    id: "texture",
    label: "Texture",
    color: "#46f0b5",
    score: 27,
    text: "Surface roughness and fine lines are read from micro-shadows across the forehead and chin.",
    marks: [[40, 25, 5], [50, 21, 5], [59, 25, 5], [50, 83, 5]],
  },
];

const PRODUCTS = [
  { name: "Redness Relief Serum", img: "/products/redness-relief-serum.svg", why: "Redness · 22" },
  { name: "Niacinamide 10% Serum", img: "/products/niacinamide-serum.svg", why: "Pores · 44" },
  { name: "Caffeine Eye Serum", img: "/products/caffeine-eye-serum.svg", why: "Dark circles · 30" },
  { name: "SPF 50 Sunscreen", img: "/products/spf50-sunscreen.svg", why: "Spots · 38" },
];

const FACES = [
  { src: "/landing/portrait-man.jpg", tag: "Oily · Type IV", score: 81, pos: "50% 25%" },
  { src: "/landing/portrait-sunset.jpg", tag: "Combination · Type II", score: 88, pos: "50% 30%" },
  { src: "/landing/closeup.jpg", tag: "Dry · Type II", score: 84, pos: "35% 40%" },
  { src: "/landing/freckles.jpg", tag: "Sensitive · Type I", score: 79, pos: "50% 45%" },
];

const Counter = ({ to, duration = 1.6, suffix = "" }) => {
  const ref = useRef(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / (duration * 1000), 1);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return <span ref={ref}>{v}{suffix}</span>;
};

const ScoreRing = ({ value, size = 150 }) => {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5ee7ff" />
            <stop offset="100%" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - value / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-4xl font-bold text-white"><Counter to={value} /></p>
        <p className="text-[11px] uppercase tracking-widest text-slate-400">Skin score</p>
      </div>
    </div>
  );
};

const Landing = () => {
  const { user } = useAuth();
  const scanLink = user ? "/scan" : "/register";
  const [stage, setStage] = useState(0);
  const [concern, setConcern] = useState(CONCERNS[0]);
  const [layer, setLayer] = useState(null);
  const stageRefs = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setStage(Number(e.target.dataset.stage))),
      // On mobile the head is pinned to the top half, so trigger stages lower in the viewport.
      { rootMargin: window.innerWidth < 1024 ? "-72% 0px -24% 0px" : "-45% 0px -45% 0px" }
    );
    stageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const active = STAGES[stage];

  return (
    <div className="fs-landing overflow-x-clip bg-[#050814] text-slate-200">
      {/* ───────── Hero ───────── */}
      <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden">
        <div className="fs-grid-bg absolute inset-0 -z-10" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[46rem] w-[46rem] -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px] lg:left-[62%]" />
        <div className="absolute -left-40 bottom-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-indigo-600/20 blur-[120px]" />

        <div className="container-app grid min-h-[calc(100svh-4rem)] items-center gap-6 py-10 lg:grid-cols-[1fr_1.15fr] lg:py-0">
          <motion.div {...reveal} className="relative z-10 order-2 lg:order-1">
            <span className="fs-eyebrow inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              AI skin analysis · on-device face mapping
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white sm:text-6xl xl:text-[3.9rem]">
              See your skin <br className="hidden sm:block" />
              the way <span className="fs-gradient-text">AI sees it.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base text-slate-400 sm:text-lg">
              One selfie. A 3D face map, six skin concerns scored zone by zone, and a routine matched to
              your results — in under a minute.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={scanLink} className="fs-btn-primary group">
                <ScanFace size={18} /> Start free skin scan
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </Link>
              <a href="#how" className="fs-btn-ghost">See how it works</a>
            </div>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {[
                [68, "", "facial landmarks"],
                [6, "", "concerns scored"],
                [60, "s", "to your results"],
              ].map(([n, s, l], i) => (
                <div key={l} className={i ? "border-l border-white/10 pl-6" : ""}>
                  <p className="font-display text-3xl font-bold text-white">
                    {i === 2 && "<"}
                    <Counter to={n} suffix={s} />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{l}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="relative order-1 h-[58svh] min-h-[380px] lg:order-2 lg:h-[calc(100svh-4rem)] lg:max-h-[860px]">
            <div className="fs-orbit absolute left-1/2 top-1/2 aspect-square w-[88%] max-w-[640px] -translate-x-1/2 -translate-y-1/2" />
            <div className="fs-orbit fs-orbit-slow absolute left-1/2 top-1/2 aspect-square w-[70%] max-w-[500px] -translate-x-1/2 -translate-y-1/2" />
            <FaceScan3D preset="hero" callouts={HERO_CALLOUTS} className="h-full w-full" />

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="fs-hud absolute left-0 top-8 hidden w-52 sm:block"
            >
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
                <span>Scanning</span>
                <span className="font-mono">LIVE</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="fs-progress h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-400" />
              </div>
              <div className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-400">
                <p className="flex justify-between"><span>mesh.vertices</span><span className="text-white">9,279</span></p>
                <p className="flex justify-between"><span>zones</span><span className="text-white">7 / 7</span></p>
                <p className="flex justify-between"><span>lighting</span><span className="text-emerald-300">OK</span></p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="fs-hud absolute bottom-10 right-0 hidden items-center gap-4 sm:flex"
            >
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                  <circle cx="28" cy="28" r="24" stroke="#5ee7ff" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="151" strokeDashoffset="21" />
                </svg>
                <span className="font-display text-lg font-bold text-white">86</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Skin health</p>
                <p className="font-display text-sm font-semibold text-white">Good · improving</p>
              </div>
            </motion.div>
          </div>
        </div>

        <a href="#how" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-500 lg:flex">
          Scroll
          <span className="fs-scroll-cue" />
        </a>
      </section>

      {/* ───────── How the analysis happens (scroll-driven 3D) ───────── */}
      <section id="how" className="relative border-t border-white/5">
        <div className="container-app pt-24 text-center">
          <motion.div {...reveal}>
            <p className="fs-eyebrow">Inside the scan</p>
            <h2 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-bold text-white sm:text-5xl">
              From a selfie to a skin map in five steps
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">Scroll to watch each stage of the analysis play out on a real 3D-scanned face.</p>
          </motion.div>
        </div>

        <div className="container-app grid gap-0 lg:grid-cols-2 lg:gap-16">
          <div className="sticky top-16 z-0 h-[48svh] lg:top-16 lg:h-[calc(100svh-4rem)]">
            <div className="absolute inset-4 rounded-[2.5rem] bg-gradient-to-b from-cyan-400/[0.06] to-transparent ring-1 ring-white/5 lg:inset-y-10" />
            <FaceScan3D preset={active.preset} callouts={active.callouts || []} autoRotate className="h-full w-full" />
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 lg:bottom-14">
              {STAGES.map((s, i) => (
                <span key={s.tag} className={`h-1.5 rounded-full transition-all duration-500 ${i === stage ? "w-8 bg-cyan-300" : "w-1.5 bg-white/20"}`} />
              ))}
            </div>
          </div>

          <div className="relative z-10 pb-[20vh]">
            {STAGES.map((s, i) => (
              <div
                key={s.tag}
                data-stage={i}
                ref={(el) => (stageRefs.current[i] = el)}
                className="flex min-h-[75svh] items-end pb-6 lg:min-h-[90svh] lg:items-center lg:pb-0"
              >
                <div className={`fs-stage-card transition-all duration-700 ${i === stage ? "opacity-100" : "opacity-40 lg:opacity-25"}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/20">
                      <s.icon size={19} />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200/70">{s.tag}</span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-bold text-white sm:text-3xl">{s.title}</h3>
                  <p className="mt-3 text-slate-400">{s.body}</p>
                  {s.stats && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {s.stats.map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/10">
                          <p className="text-[11px] uppercase tracking-wider text-slate-500">{k}</p>
                          <p className="mt-0.5 font-display text-lg font-semibold text-white">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {s.legend && (
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      {s.legend.map(([c, l]) => (
                        <span key={l} className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="h-3 w-3 rounded-full" style={{ background: c, boxShadow: `0 0 12px ${c}` }} />
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Live model on a real photo ───────── */}
      <section className="relative border-t border-white/5 py-24 sm:py-32">
        <div className="absolute right-0 top-1/3 -z-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="container-app relative">
          <LiveLandmarks />
        </div>
      </section>

      {/* ───────── Beneath the surface (3D skin layers) ───────── */}
      <section className="relative overflow-hidden border-t border-white/5 py-24 sm:py-32">
        <div className="fs-grid-bg absolute inset-0 opacity-50" />
        <div className="container-app relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.3fr]">
          <motion.div {...reveal}>
            <p className="fs-eyebrow">Beneath the surface</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">
              What your skin shows starts <span className="fs-gradient-text">layers deep.</span>
            </h2>
            <p className="mt-4 max-w-md text-slate-400">
              Every concern we score has a source. Pores and texture live on the surface, spots come from
              melanin in the epidermis, and redness from vessels in the dermis. Hover a layer to explore.
            </p>
            <div className="mt-8 space-y-2.5">
              {[
                { id: "epidermis", color: "#b38bff", name: "Epidermis", what: "Spots · uneven tone · pigmentation" },
                { id: "dermis", color: "#ff5a6e", name: "Dermis", what: "Redness · fine lines · firmness" },
                { id: "hypo", color: "#f6d77e", name: "Subcutis", what: "Volume · under-eye hollows" },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onMouseEnter={() => setLayer(l.id)}
                  onMouseLeave={() => setLayer(null)}
                  onFocus={() => setLayer(l.id)}
                  onBlur={() => setLayer(null)}
                  onClick={() => setLayer((cur) => (cur === l.id ? null : l.id))}
                  className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left ring-1 transition ${
                    layer === l.id ? "bg-white/[0.06] ring-white/25" : "bg-white/[0.02] ring-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="h-8 w-1.5 rounded-full" style={{ background: l.color, boxShadow: `0 0 16px ${l.color}` }} />
                  <span>
                    <span className="block font-semibold text-white">{l.name}</span>
                    <span className="text-sm text-slate-400">{l.what}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
          <motion.div {...reveal} className="relative h-[420px] sm:h-[560px]">
            <SkinLayers3D activeLayer={layer} className="h-full w-full" />
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-3 whitespace-nowrap rounded-xl bg-slate-950/60 p-2.5 text-[10px] ring-1 ring-white/10 backdrop-blur sm:bottom-auto sm:left-auto sm:right-6 sm:top-6 sm:block sm:translate-x-0 sm:space-y-1.5 sm:p-3 sm:text-[11px]">
              {[
                ["#b38bff", "Surface light · pigment"],
                ["#ffffff", "Visible light · tone"],
                ["#ff5a6e", "Deep red · vessels"],
              ].map(([c, l]) => (
                <p key={l} className="flex items-center gap-2 text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} /> {l}
                </p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── Concern explorer on a real face ───────── */}
      <section className="relative border-t border-white/5 py-24 sm:py-32">
        <div className="container-app">
          <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
            <p className="fs-eyebrow">What we detect</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">Five concerns. Pinpointed.</h2>
            <p className="mt-4 text-slate-400">Pick a concern to see where the analysis finds it on a real face.</p>
          </motion.div>

          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <motion.div {...reveal} className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-[2rem] ring-1 ring-white/10">
              <img
                src="/landing/freckles.jpg"
                alt="Face showing freckles and natural skin texture"
                className="absolute max-w-none"
                style={{ width: "236.8%", left: "-71%", top: "-21%" }}
              />
              <div className="absolute inset-0 bg-slate-950/10" />
              <div className="fs-photo-scan" />
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                {concern.marks.map(([x, y, r], i) => (
                  <g key={`${concern.id}-${i}`} className="fs-mark" style={{ animationDelay: `${i * 90}ms`, color: concern.color }}>
                    <circle cx={x} cy={y} r={r} fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="0.35" />
                    <circle cx={x} cy={y} r={r} fill="none" stroke="currentColor" strokeWidth="0.25" className="fs-mark-pulse" />
                    <circle cx={x} cy={y} r="0.6" fill="currentColor" />
                  </g>
                ))}
              </svg>
              <div className="absolute left-4 top-4 rounded-lg bg-slate-950/70 px-3 py-1.5 font-mono text-[11px] text-white ring-1 ring-white/10 backdrop-blur">
                {concern.label.toUpperCase()} · {concern.marks.length} regions
              </div>
            </motion.div>

            <div className="space-y-2.5">
              {CONCERNS.map((c) => {
                const on = c.id === concern.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConcern(c)}
                    className={`w-full rounded-2xl px-5 py-4 text-left ring-1 transition-all duration-300 ${
                      on ? "bg-white/[0.06] ring-white/25" : "bg-white/[0.02] ring-white/10 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 12px ${c.color}` }} />
                        <span className="font-semibold text-white">{c.label}</span>
                      </span>
                      <span className="flex w-32 items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full transition-all duration-700" style={{ width: on ? `${c.score}%` : "0%", background: c.color }} />
                        </span>
                        <span className="w-6 text-right font-mono text-xs text-slate-400">{c.score}</span>
                      </span>
                    </div>
                    <div className={`grid transition-all duration-500 ${on ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <p className="overflow-hidden text-sm text-slate-400">{c.text}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Every face ───────── */}
      <section className="border-t border-white/5 py-24 sm:py-32">
        <div className="container-app">
          <motion.div {...reveal} className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="fs-eyebrow">Built for every face</p>
              <h2 className="mt-3 max-w-xl font-display text-3xl font-bold text-white sm:text-5xl">Every skin tone. Every skin type.</h2>
            </div>
            <p className="max-w-sm text-slate-400">The analysis calibrates to your own base tone, so results stay fair across skin types I–VI.</p>
          </motion.div>
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {FACES.map((f, i) => (
              <motion.div
                key={f.src}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.08 }}
                className="group relative aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-white/10"
              >
                <img src={f.src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: f.pos }} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                <div className="fs-photo-scan opacity-0 transition group-hover:opacity-100" style={{ animationDelay: `${i * 0.4}s` }} />
                <div className="fs-corners absolute inset-6 opacity-60 transition group-hover:inset-4 group-hover:opacity-100" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/80">{f.tag}</p>
                    <p className="font-display text-sm font-semibold text-white">Scan complete</p>
                  </div>
                  <span className="font-display text-2xl font-bold text-white">{f.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Report → routine ───────── */}
      <section className="relative overflow-hidden border-t border-white/5 py-24 sm:py-32">
        <div className="absolute left-1/4 top-1/2 h-[30rem] w-[30rem] -translate-y-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="container-app relative grid items-center gap-14 lg:grid-cols-2">
          <motion.div {...reveal} className="fs-glass mx-auto w-full max-w-md p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Your skin report</p>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">+4 since last scan</span>
            </div>
            <div className="mt-6 flex items-center gap-6">
              <ScoreRing value={86} />
              <div className="flex-1 space-y-3">
                {CONCERNS.slice(0, 4).map((c, i) => (
                  <div key={c.id}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{c.label}</span>
                      <span className="font-mono text-slate-500">{c.score}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: c.color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${c.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.3 + i * 0.12 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Matched routine</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {PRODUCTS.map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + i * 0.12 }}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/10"
                >
                  <img src={p.img} alt="" className="h-11 w-11 rounded-lg bg-white/90 object-contain p-1" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.why}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div {...reveal}>
            <p className="fs-eyebrow">From analysis to routine</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">A report you can act on — instantly.</h2>
            <p className="mt-4 max-w-md text-slate-400">
              Your score, your concerns and the products that target them, side by side. Track progress over time and
              reorder in one tap.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Cpu, t: "On-device face mapping", d: "Landmarks are found in your browser before anything is sent." },
                { icon: ShieldCheck, t: "Private by design", d: "Your photos and results stay tied to your account only." },
                { icon: Activity, t: "Progress tracking", d: "Compare scans over weeks and see what's working." },
                { icon: ShoppingBag, t: "Shop the routine", d: "Add your matched products to the bag in one tap." },
              ].map((f) => (
                <div key={f.t} className="rounded-2xl bg-white/[0.02] p-5 ring-1 ring-white/10">
                  <f.icon size={20} className="text-cyan-300" />
                  <p className="mt-3 font-semibold text-white">{f.t}</p>
                  <p className="mt-1 text-sm text-slate-400">{f.d}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="container-app pb-24">
        <motion.div {...reveal} className="relative overflow-hidden rounded-[2.5rem] ring-1 ring-white/10">
          <img src="/landing/facial.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050814] via-[#050814]/85 to-[#050814]/30" />
          <div className="fs-photo-scan" />
          <div className="relative px-8 py-16 sm:px-14 sm:py-24">
            <p className="fs-eyebrow">Your turn</p>
            <h2 className="mt-3 max-w-lg font-display text-3xl font-bold text-white sm:text-5xl">Ready to meet your skin?</h2>
            <p className="mt-4 max-w-md text-slate-300">Take a selfie and get your full 3D skin analysis and personal routine in under a minute. Free.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={scanLink} className="fs-btn-primary group">
                <ScanFace size={18} /> Start my skin scan
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </Link>
              <Link to="/shop" className="fs-btn-ghost">Browse products</Link>
            </div>
          </div>
        </motion.div>
        <p className="mt-6 text-center text-[11px] text-slate-600">
          3D head built from MakeHuman assets (CC0). Photos via Unsplash.
        </p>
      </section>
    </div>
  );
};

export default Landing;
