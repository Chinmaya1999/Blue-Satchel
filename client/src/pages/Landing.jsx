import { Link } from "react-router-dom";
import { ScanFace, Sparkles, ShoppingBag, ShieldCheck, ArrowRight, Camera, Wand2, PackageCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const steps = [
  { icon: Camera, title: "Take a selfie", desc: "Capture or upload a clear, well-lit photo of your face in seconds." },
  { icon: Wand2, title: "Get AI analysis", desc: "Our diagnostics engine scores spots, pores, texture, redness & dark circles." },
  { icon: PackageCheck, title: "Shop your routine", desc: "Receive a personalized product routine and check out instantly." },
];

const features = [
  { icon: ScanFace, title: "AI Skin Diagnostics", desc: "Enterprise-grade analysis delivering an overall skin health score and concern breakdown." },
  { icon: Sparkles, title: "Personalized Recommendations", desc: "Product matches generated from your unique scan results and skin type." },
  { icon: ShoppingBag, title: "Seamless Commerce", desc: "Browse, add to bag and check out without ever leaving the app." },
  { icon: ShieldCheck, title: "Secure & Scalable", desc: "Built on a modular, API-first platform ready for enterprise integrations." },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div>
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="container-app relative grid gap-12 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center animate-fade-up">
            <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-white/20">
              <Sparkles size={13} /> AI-Powered Skin Diagnostics
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl">
              Know your skin.<br />Shop what it needs.
            </h1>
            <p className="mt-5 max-w-md text-base text-brand-100/90">
              Blue Satchel scans your skin with AI, scores your concerns, and builds a personalized
              skincare routine you can buy in one tap.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? "/scan" : "/register"} className="btn bg-white text-brand-800 shadow-soft hover:bg-brand-50">
                <ScanFace size={17} /> Start your skin scan <ArrowRight size={15} />
              </Link>
              <Link to="/shop" className="btn bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20">
                Browse products
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-8 text-brand-100/80">
              <div><p className="font-display text-2xl font-bold text-white">98%</p><p className="text-xs">Scan accuracy confidence</p></div>
              <div className="h-8 w-px bg-white/20" />
              <div><p className="font-display text-2xl font-bold text-white">40+</p><p className="text-xs">Curated skincare products</p></div>
              <div className="h-8 w-px bg-white/20" />
              <div><p className="font-display text-2xl font-bold text-white">&lt;60s</p><p className="text-xs">Time to your results</p></div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-sm animate-fade-up rounded-3xl bg-white p-5 shadow-2xl" style={{ animationDelay: "0.15s" }}>
              <p className="mb-4 text-sm font-semibold text-slate-500">SKIN ANALYSIS</p>
              <div className="mb-5 flex items-center justify-center">
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-emerald-100">
                  <div className="absolute inset-0 rounded-full border-[10px] border-emerald-500" style={{ clipPath: "polygon(50% 50%, 0 0, 100% 0, 100% 100%, 20% 100%)" }} />
                  <div className="text-center">
                    <p className="font-display text-3xl font-extrabold text-slate-900">85</p>
                    <p className="text-[11px] text-slate-400">/100 Good</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { l: "Spots", v: "Medium", c: "bg-amber-400" },
                  { l: "Pores", v: "Low", c: "bg-emerald-400" },
                  { l: "Texture", v: "Medium", c: "bg-amber-400" },
                  { l: "Redness", v: "Low", c: "bg-emerald-400" },
                ].map((row) => (
                  <div key={row.l} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{row.l}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold text-white ${row.c}`}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-app py-20">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="font-display text-3xl font-bold text-slate-900">How it works</h2>
          <p className="mt-2 text-slate-500">From selfie to routine in three simple steps.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="card relative p-6">
              <span className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-soft">
                {i + 1}
              </span>
              <s.icon className="mb-4 text-brand-600" size={28} />
              <h3 className="font-display font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-app">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="font-display text-3xl font-bold text-slate-900">Built for real skincare journeys</h2>
            <p className="mt-2 text-slate-500">A unified, mobile-first platform connecting diagnostics, commerce and CRM.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 p-6 transition hover:border-brand-200 hover:shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app py-20">
        <div className="overflow-hidden rounded-3xl bg-hero-gradient px-8 py-14 text-center shadow-soft sm:px-16">
          <h2 className="font-display text-3xl font-bold text-white">Ready to see your skin score?</h2>
          <p className="mx-auto mt-3 max-w-md text-brand-100/90">
            Create your free account and get your first AI skin analysis in under a minute.
          </p>
          <Link to={user ? "/scan" : "/register"} className="btn mt-7 inline-flex bg-white text-brand-800 hover:bg-brand-50">
            <ScanFace size={17} /> Get started free
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
