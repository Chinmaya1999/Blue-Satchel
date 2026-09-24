import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import FaceScan3D from "./FaceScan3D.jsx";
import { prefersReducedMotion } from "./three-utils.js";

// Dark split-screen used by Login and Register: live 3D face on one side, glass form on the other.
const AuthShell = ({ stages, eyebrow, title, subtitle, error, children, footer }) => {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % stages.length), 3200);
    return () => clearInterval(id);
  }, [stages.length]);

  const stage = stages[i];

  return (
    <div className="fs-landing relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-[#050814] text-slate-300">
      <div className="fs-grid-bg absolute inset-0 -z-10" />
      <div className="absolute -left-40 top-1/3 -z-10 h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-[130px]" />
      <div className="absolute -right-40 bottom-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-indigo-600/20 blur-[130px]" />

      <div className="container-app grid min-h-[calc(100svh-4rem)] items-center gap-4 py-8 lg:grid-cols-2 lg:gap-12 lg:py-0">
        {/* Visual */}
        <div className="relative h-[250px] sm:h-[320px] lg:h-[calc(100svh-4rem)] lg:max-h-[820px]">
          <div className="fs-orbit absolute left-1/2 top-1/2 aspect-square w-[80%] max-w-[560px] -translate-x-1/2 -translate-y-1/2" />
          <div className="fs-orbit fs-orbit-slow absolute left-1/2 top-1/2 aspect-square w-[62%] max-w-[440px] -translate-x-1/2 -translate-y-1/2" />
          <FaceScan3D preset={stage.preset} callouts={stage.callouts || []} className="h-full w-full" />

          <div className="absolute bottom-2 left-1/2 w-[min(100%,22rem)] -translate-x-1/2 lg:bottom-16">
            <div className="fs-hud flex items-center gap-3 !p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 font-mono text-xs font-bold text-cyan-300 ring-1 ring-cyan-300/25">
                0{i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="truncate text-sm font-semibold text-white">{stage.label}</p>
                    <p className="truncate text-xs text-slate-400">{stage.detail}</p>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-2 flex gap-1">
                  {stages.map((s, n) => (
                    <span key={s.label} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      {n <= i && <span key={i} className={`block h-full bg-cyan-300 ${n === i ? "fs-auth-progress" : ""}`} />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md pb-10 lg:pb-0"
        >
          <div className="fs-auth-card relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
            <div className="fs-auth-card-glow" />
            <p className="fs-eyebrow">{eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-[2.1rem]">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200 ring-1 ring-rose-400/25">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {children}
          </div>
          {footer}
        </motion.div>
      </div>
    </div>
  );
};

// Dark input with an icon and a label that floats up on focus / when filled.
export const Field = ({ icon: Icon, label, right, className = "", ...input }) => (
  <label className={`fs-field ${className}`}>
    <Icon size={17} className="fs-field-icon" />
    <input placeholder=" " className="fs-field-input" {...input} />
    <span className="fs-field-label">{label}</span>
    {right}
  </label>
);

export default AuthShell;
