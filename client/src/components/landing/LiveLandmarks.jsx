import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const PHOTO = "/landing/portrait-front.jpg";

// 68-point contour groups (iBUG layout) — closed groups loop back to their start.
const GROUPS = [
  { from: 0, to: 16 },
  { from: 17, to: 21 },
  { from: 22, to: 26 },
  { from: 27, to: 30 },
  { from: 31, to: 35 },
  { from: 36, to: 41, closed: true },
  { from: 42, to: 47, closed: true },
  { from: 48, to: 59, closed: true },
  { from: 60, to: 67, closed: true },
];

// Triangulated mesh between landmarks for the "face mesh" stage.
const MESH = [
  [0, 17, 36], [17, 18, 36], [18, 19, 37], [19, 20, 38], [20, 21, 39], [21, 27, 39], [22, 27, 42], [22, 23, 43],
  [23, 24, 44], [24, 25, 45], [25, 26, 45], [26, 16, 45], [36, 41, 1], [1, 41, 31], [41, 40, 31], [40, 39, 31],
  [39, 27, 28], [39, 28, 31], [28, 29, 31], [29, 30, 31], [42, 27, 28], [42, 28, 35], [28, 29, 35], [29, 30, 35],
  [47, 42, 35], [46, 47, 35], [46, 35, 15], [45, 46, 15], [1, 31, 2], [2, 31, 48], [2, 48, 3], [3, 48, 4],
  [4, 48, 5], [5, 48, 59], [5, 59, 6], [6, 59, 58], [6, 58, 7], [7, 58, 57], [7, 57, 8], [8, 57, 9], [9, 57, 56],
  [9, 56, 10], [10, 56, 55], [10, 55, 11], [11, 55, 54], [11, 54, 12], [12, 54, 13], [13, 54, 14], [14, 54, 35],
  [14, 35, 15], [31, 32, 48], [32, 33, 50], [33, 34, 52], [34, 35, 54], [32, 48, 49], [32, 49, 50], [33, 50, 51],
  [33, 51, 52], [34, 52, 53], [34, 53, 54],
];

const STEPS = [
  { key: "detect", label: "Face detected", detail: "Tiny face detector · bounding box" },
  { key: "points", label: "68 landmarks located", detail: "Eyes, brows, nose, lips, jawline" },
  { key: "mesh", label: "Face mesh built", detail: "Geometry aligned to your features" },
  { key: "zones", label: "Skin zones mapped", detail: "Forehead · T-zone · cheeks · chin" },
];

const avg = (pts, ids) => ids.reduce((a, i) => ({ x: a.x + pts[i].x / ids.length, y: a.y + pts[i].y / ids.length }), { x: 0, y: 0 });

const LiveLandmarks = () => {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | running | done | fallback
  const [step, setStep] = useState(-1);
  const [box, setBox] = useState(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    let cancelled = false;
    let raf = 0;
    let started = false;

    const run = async () => {
      setStatus("loading");
      try {
        const faceapi = await import("face-api.js");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        ]);
        const img = imgRef.current;
        if (!img.complete) await new Promise((r) => (img.onload = r));
        const res = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
          .withFaceLandmarks(true);
        if (cancelled) return;
        if (!res) throw new Error("no face");
        setStatus("running");
        animate(res.detection.box, res.detection.score, res.landmarks.positions, img.naturalWidth, img.naturalHeight);
      } catch {
        if (!cancelled) setStatus("fallback");
      }
    };

    // Draws detection → points → mesh → zones, then keeps a subtle live shimmer going.
    const animate = (b, score, pts, nw, nh) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const start = performance.now();
      setBox({ x: b.x / nw, y: b.y / nh, w: b.width / nw, h: b.height / nh, score });

      const frame = (now) => {
        if (cancelled) return;
        const dpr = Math.min(window.devicePixelRatio, 2);
        const { width, height } = canvas.getBoundingClientRect();
        if (canvas.width !== Math.round(width * dpr)) {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
        }
        const sx = (width / nw) * dpr;
        const sy = (height / nh) * dpr;
        const P = pts.map((p) => ({ x: p.x * sx, y: p.y * sy }));
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pointsP = Math.min(Math.max((t - 1.0) / 1.6, 0), 1);
        const meshP = Math.min(Math.max((t - 2.8) / 1.4, 0), 1);
        const zonesP = Math.min(Math.max((t - 4.4) / 1.0, 0), 1);
        setStep(t < 1 ? 0 : t < 2.8 ? 1 : t < 4.4 ? 2 : 3);

        // Mesh
        if (meshP > 0) {
          ctx.lineWidth = 0.8 * dpr;
          const n = Math.floor(MESH.length * meshP);
          for (let i = 0; i < n; i++) {
            const [a, b2, c] = MESH[i];
            ctx.strokeStyle = `rgba(125, 233, 255, ${0.28 * (zonesP > 0 ? 1 - zonesP * 0.5 : 1)})`;
            ctx.beginPath();
            ctx.moveTo(P[a].x, P[a].y);
            ctx.lineTo(P[b2].x, P[b2].y);
            ctx.lineTo(P[c].x, P[c].y);
            ctx.closePath();
            ctx.stroke();
          }
        }

        // Contours
        if (pointsP > 0) {
          ctx.lineWidth = 1.4 * dpr;
          ctx.strokeStyle = "rgba(94, 231, 255, 0.85)";
          ctx.shadowColor = "rgba(94, 231, 255, 0.8)";
          ctx.shadowBlur = 8 * dpr;
          const visible = Math.floor(68 * pointsP);
          GROUPS.forEach((g) => {
            if (visible <= g.from) return;
            ctx.beginPath();
            const end = Math.min(g.to, visible - 1);
            for (let i = g.from; i <= end; i++) (i === g.from ? ctx.moveTo : ctx.lineTo).call(ctx, P[i].x, P[i].y);
            if (g.closed && end === g.to) ctx.closePath();
            ctx.stroke();
          });
          ctx.shadowBlur = 0;
          for (let i = 0; i < visible; i++) {
            const pulse = 1 + 0.35 * Math.sin(t * 4 + i * 0.6);
            ctx.fillStyle = "#e9fdff";
            ctx.beginPath();
            ctx.arc(P[i].x, P[i].y, 2.1 * dpr * pulse, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Zones
        if (zonesP > 0) {
          const faceW = P[16].x - P[0].x;
          const browY = Math.min(P[19].y, P[24].y);
          const zones = [
            { c: { x: (P[19].x + P[24].x) / 2, y: browY - faceW * 0.16 }, rx: faceW * 0.3, ry: faceW * 0.1, color: "255, 190, 60" },
            { c: avg(P, [2, 3, 31, 48, 41]), rx: faceW * 0.12, ry: faceW * 0.1, color: "255, 80, 110" },
            { c: avg(P, [14, 13, 35, 54, 46]), rx: faceW * 0.12, ry: faceW * 0.1, color: "255, 80, 110" },
            { c: { x: P[30].x, y: (P[28].y + P[30].y) / 2 }, rx: faceW * 0.06, ry: faceW * 0.14, color: "255, 190, 60" },
            { c: avg(P, [7, 8, 9, 57]), rx: faceW * 0.12, ry: faceW * 0.06, color: "80, 255, 190" },
            { c: { x: avg(P, [36, 39]).x, y: avg(P, [40, 41]).y + faceW * 0.04 }, rx: faceW * 0.08, ry: faceW * 0.03, color: "160, 120, 255" },
            { c: { x: avg(P, [42, 45]).x, y: avg(P, [46, 47]).y + faceW * 0.04 }, rx: faceW * 0.08, ry: faceW * 0.03, color: "160, 120, 255" },
          ];
          zones.forEach((z, i) => {
            const a = zonesP * (0.75 + 0.25 * Math.sin(t * 2.2 + i));
            const g = ctx.createRadialGradient(z.c.x, z.c.y, 0, z.c.x, z.c.y, Math.max(z.rx, z.ry));
            g.addColorStop(0, `rgba(${z.color}, ${0.42 * a})`);
            g.addColorStop(1, `rgba(${z.color}, 0)`);
            ctx.save();
            ctx.translate(z.c.x, z.c.y);
            ctx.scale(z.rx / Math.max(z.rx, z.ry), z.ry / Math.max(z.rx, z.ry));
            ctx.translate(-z.c.x, -z.c.y);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(z.c.x, z.c.y, Math.max(z.rx, z.ry), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }

        if (t > 5.6 && !started) {
          started = true;
          setStatus("done");
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        run();
      }
    }, { threshold: 0.35 });
    io.observe(wrap);
    return () => {
      cancelled = true;
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const scanning = status === "loading" || status === "running" || status === "fallback";

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <div ref={wrapRef} className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] ring-1 ring-white/10 shadow-[0_40px_120px_-30px_rgba(56,189,248,0.35)]">
        <img ref={imgRef} src={PHOTO} alt="Portrait being analysed" className="block w-full" crossOrigin="anonymous" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/50" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {box && (
          <div
            className="fs-bbox absolute"
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
          >
            <span className="absolute -top-6 left-0 rounded bg-cyan-300 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">FACE {box.score.toFixed(2)}</span>
          </div>
        )}
        {scanning && <div className="fs-photo-scan" />}

        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-xl bg-slate-950/70 px-3.5 py-2.5 text-xs ring-1 ring-white/10 backdrop-blur">
          <span className="flex items-center gap-2 font-medium text-white">
            <span className={`h-2 w-2 rounded-full ${status === "done" ? "bg-emerald-400" : "animate-pulse bg-cyan-300"}`} />
            {status === "idle" && "Waiting…"}
            {status === "loading" && "Loading on-device model…"}
            {status === "running" && "Analysing in your browser"}
            {status === "done" && "Analysis complete"}
            {status === "fallback" && "Scanning preview"}
          </span>
          <span className="font-mono text-cyan-200/80">on-device · 0 uploads</span>
        </div>
      </div>

      <div>
        <p className="fs-eyebrow">Real model · running now</p>
        <h3 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
          Watch the AI read a face, <span className="fs-gradient-text">live.</span>
        </h3>
        <p className="mt-4 max-w-md text-slate-400">
          This isn&apos;t a video. The same face-detection and landmark model used in our scanner is running in
          your browser right now on this portrait — finding the face, locating 68 key points, building a mesh
          and mapping the skin zones we score.
        </p>
        <ol className="mt-8 space-y-3">
          {STEPS.map((s, i) => {
            const done = step > i || status === "done";
            const active = step === i && status !== "done";
            return (
              <li
                key={s.key}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3 ring-1 transition-all duration-500 ${
                  active ? "bg-cyan-400/10 ring-cyan-300/40" : done ? "bg-white/[0.03] ring-white/10" : "ring-white/5 opacity-50"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? "bg-emerald-400 text-slate-950" : active ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-slate-400"
                  }`}
                >
                  {done ? <Check size={15} /> : active ? <Loader2 size={15} className="animate-spin" /> : i + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{s.label}</p>
                  <p className="text-xs text-slate-400">{s.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default LiveLandmarks;
