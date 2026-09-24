import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScanFace, ChevronRight, Plus } from "lucide-react";
import api from "../api/axios.js";
import Loader from "../components/Loader.jsx";

const levelDot = { Low: "bg-emerald-400", Medium: "bg-amber-400", High: "bg-rose-400" };

const ScanHistoryPage = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/scans").then(({ data }) => setScans(data.scans)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="fs-page fs-page-bg"><Loader full label="Loading scan history…" /></div>;

  return (
    <div className="fs-page fs-page-bg">
    <div className="container-app max-w-3xl py-12">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="fs-eyebrow">Your skin timeline</p>
          <h1 className="fs-page-title mt-3">Scan <span className="fs-gradient-text">history</span></h1>
          <p className="fs-page-sub">Track how your skin score changes over time.</p>
        </div>
        <Link to="/scan" className="btn-primary hidden rounded-full sm:inline-flex"><Plus size={15} /> New scan</Link>
      </div>

      {scans.length === 0 ? (
        <div className="card relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl p-14 text-center">
          <div className="fs-photo-scan" />
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/25 shadow-[0_0_40px_-8px_rgba(94,231,255,0.5)]"><ScanFace size={34} /></span>
          <p className="font-medium text-slate-500">You haven't taken a skin scan yet.</p>
          <Link to="/scan" className="btn-primary relative mt-2 rounded-full">Take your first scan</Link>
        </div>
      ) : (
        <div className="fs-timeline space-y-4">
          {scans.map((s) => (
            <Link
              key={s._id}
              to={`/scan/${s._id}`}
              className="card group relative flex items-center gap-4 rounded-3xl p-4 transition hover:shadow-soft"
            >
              <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl ring-1 ring-cyan-300/25">
                <img src={s.imageUrl} alt="scan" className="h-full w-full object-cover" />
                <span className="fs-photo-scan opacity-0 transition group-hover:opacity-100" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-2xl font-bold text-white">{s.overallScore}<span className="text-sm font-medium text-slate-500">/100</span></p>
                  <span className="fs-chip !py-0.5">{s.overallLabel}</span>
                </div>
                <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.concerns.slice(0, 5).map((c) => (
                    <span key={c.key} className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${levelDot[c.level]}`} /> {c.label}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

export default ScanHistoryPage;
