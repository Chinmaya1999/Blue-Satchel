import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, Navigation, Store, Loader2 } from "lucide-react";
import api from "../api/axios.js";
import Loader from "../components/Loader.jsx";
import { Stars } from "../components/salon/StarRating.jsx";
import { getBrowserLocation } from "../utils/geo.js";

export const SalonCard = ({ s }) => (
  <Link to={`/salons/${s.slug}`} className="card group overflow-hidden rounded-2xl transition hover:-translate-y-0.5">
    <div className="relative aspect-[16/9] bg-slate-900">
      {s.coverUrl ? (
        <img src={s.coverUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-600"><Store size={34} /></div>
      )}
      {s.featured && <span className="absolute left-3 top-3 rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-950">Featured</span>}
      {s.distanceKm != null && <span className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{s.distanceKm} km</span>}
    </div>
    <div className="flex gap-3 p-4">
      {s.logoUrl ? (
        <img src={s.logoUrl} alt="" className="-mt-9 h-14 w-14 shrink-0 rounded-2xl border-2 border-[color:var(--fs-bg)] object-cover" />
      ) : (
        <span className="-mt-9 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:var(--fs-bg)] bg-cyan-300 font-display text-lg font-bold text-slate-950">{s.name.charAt(0)}</span>
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-base font-bold text-white">{s.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
          {s.ratingCount > 0 ? (<><Stars value={s.ratingAvg} size={12} /> <span className="font-semibold text-slate-200">{s.ratingAvg}</span> ({s.ratingCount})</>) : <span>New</span>}
        </div>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-400"><MapPin size={12} className="shrink-0" /> {[s.address?.city, s.address?.state].filter(Boolean).join(", ")}</p>
      </div>
    </div>
  </Link>
);

const Salons = () => {
  const [salons, setSalons] = useState(null);
  const [q, setQ] = useState("");
  const [near, setNear] = useState(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => {
      api
        .get("/salons", { params: { q, ...(near ? { lat: near.lat, lng: near.lng, sort: "distance" } : {}) }, signal: c.signal })
        .then(({ data }) => setSalons(data.salons))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q, near]);

  const locate = async () => {
    setLocating(true);
    setDenied(false);
    const loc = await getBrowserLocation();
    setLocating(false);
    if (loc) setNear(loc);
    else setDenied(true);
  };

  return (
    <div className="fs-page fs-page-bg min-h-[80vh]">
      <div className="container-app py-12">
        <p className="fs-eyebrow">Partner salons</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Find a <span className="fs-gradient-text">salon near you</span></h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">Blue Satchel partner salons that offer AI skin scans, personalised reports and professional products.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <label className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-10" placeholder="Search by salon, city or service" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button onClick={near ? () => setNear(null) : locate} className="btn-secondary rounded-full">
            {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />} {near ? "Showing nearest first · clear" : "Near me"}
          </button>
        </div>
        {denied && <p className="mt-2 text-xs text-amber-300">Allow location access in your browser to sort by distance.</p>}

        <div className="mt-8">
          {!salons ? (
            <Loader label="Loading salons…" />
          ) : salons.length === 0 ? (
            <p className="py-16 text-center text-slate-400">No salons found yet. Check back soon.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{salons.map((s) => <SalonCard key={s.id} s={s} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Salons;
