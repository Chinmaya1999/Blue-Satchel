import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScanFace } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { formatPaise } from "../../utils/money.js";

const SalonScans = () => {
  const [scans, setScans] = useState(null);
  useEffect(() => {
    api.get("/salon/scans").then(({ data }) => setScans(data.scans));
  }, []);
  if (!scans) return <Loader label="Loading scans…" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">Customer scans</h1>
        <Link to="/salon/scan" className="btn-primary rounded-full"><ScanFace size={16} /> New scan</Link>
      </div>
      {scans.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">No customers scanned yet.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {scans.map((s) => (
            <Link key={s._id} to={`/salon/scans/${s._id}`} className="flex items-center gap-4 p-4 transition hover:bg-slate-50">
              <img src={s.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{s.salonCustomer?.name || "Customer"}</p>
                <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleString()} · {s.mode} scan</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-slate-900">{s.overallScore}</p>
                <p className="text-[11px] text-slate-400">{s.overallLabel}</p>
              </div>
              <div className="hidden w-28 text-right sm:block">
                {s.bill ? (
                  <>
                    <span className={`badge ${s.bill.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{s.bill.status}</span>
                    <p className="mt-0.5 text-xs text-slate-500">{formatPaise(s.bill.totalPaise)}</p>
                  </>
                ) : (
                  <span className="text-xs text-slate-300">No bill</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalonScans;
