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

  if (loading) return <Loader full label="Loading scan history…" />;

  return (
    <div className="container-app max-w-3xl py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Scan History</h1>
          <p className="mt-1 text-slate-500">Track how your skin score changes over time.</p>
        </div>
        <Link to="/scan" className="btn-primary hidden sm:inline-flex"><Plus size={15} /> New scan</Link>
      </div>

      {scans.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <ScanFace size={36} className="text-slate-300" />
          <p className="font-medium text-slate-500">You haven't taken a skin scan yet.</p>
          <Link to="/scan" className="btn-primary mt-2">Take your first scan</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <Link
              key={s._id}
              to={`/scan/${s._id}`}
              className="card flex items-center gap-4 p-4 transition hover:shadow-soft"
            >
              <img src={s.imageUrl} alt="scan" className="h-16 w-16 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-bold text-slate-900">{s.overallScore}/100</p>
                  <span className="badge bg-slate-100 text-slate-600">{s.overallLabel}</span>
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
              <ChevronRight size={18} className="text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScanHistoryPage;
