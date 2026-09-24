import { Link, useLocation } from "react-router-dom";
import { ScanFace, ArrowRight, Cpu, ShieldCheck, Lock } from "lucide-react";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Footer = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  // Customer pages are dark and run straight into the footer; the light admin console keeps a gap.
  const flush = !pathname.startsWith("/admin");

  const columns = [
    {
      title: "Explore",
      links: [
        ["Home", "/"],
        ["Shop skincare", "/shop"],
        ["Skin scan", user ? "/scan" : "/register"],
        ["Scan history", user ? "/scan/history" : "/login"],
      ],
    },
    {
      title: "Account",
      links: user
        ? [
            ["Profile", "/profile"],
            ["Orders", "/orders"],
          ]
        : [
            ["Sign in", "/login"],
            ["Create account", "/register"],
          ],
    },
  ];

  return (
    <footer className={`fs-footer relative isolate overflow-hidden ${flush ? "" : "mt-20"} bg-[#050814] text-slate-400`}>
      <div className="fs-footer-line" />
      <div className="fs-grid-bg absolute inset-0 -z-10 opacity-60" />
      <div className="absolute -top-40 left-1/2 -z-10 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="container-app pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <div className="col-span-2 lg:col-span-1">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              AI skin diagnostics that map your face in 3D, score every concern zone by zone, and build the routine
              your skin actually needs.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                [Cpu, "On-device mapping"],
                [ShieldCheck, "Private by design"],
                [Lock, "Secure checkout"],
              ].map(([Icon, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-300 ring-1 ring-white/10">
                  <Icon size={12} className="text-cyan-300" /> {label}
                </span>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">{col.title}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="group inline-flex items-center gap-2 text-sm transition hover:text-white">
                      <span className="h-px w-0 bg-cyan-300 transition-all duration-300 group-hover:w-3" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="fs-footer-card relative col-span-2 overflow-hidden rounded-3xl p-6 lg:col-span-1">
            <div className="fs-photo-scan" />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/25">
                <ScanFace size={22} />
              </span>
              <p className="mt-4 font-display text-lg font-semibold text-white">Your skin score is 60 seconds away.</p>
              <p className="mt-1 text-sm">One selfie. A full 3D skin report. Free.</p>
              <Link to={user ? "/scan" : "/register"} className="fs-nav-cta group mt-5 w-fit">
                Start scan <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-16 select-none overflow-hidden" aria-hidden="true">
        <p className="fs-footer-wordmark">BLUE SATCHEL</p>
      </div>

      <div className="border-t border-white/5">
        <div className="container-app flex flex-col items-start justify-between gap-3 py-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Blue Satchel · Proof of Concept build for demonstration purposes.</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#5ee7ff]" />
            Built for every skin tone and type
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
