import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { formatPaise } from "../../utils/money.js";

const SalonBills = () => {
  const [bills, setBills] = useState(null);
  useEffect(() => {
    api.get("/salon/bills").then(({ data }) => setBills(data.bills));
  }, []);
  if (!bills) return <Loader label="Loading bills…" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">Bills</h1>
      {bills.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">No bills yet. Scan a customer, then generate their bill.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3"><Link to={`/salon/bills/${b._id}`} className="font-semibold text-brand-600 hover:underline">{b.invoiceNumber}</Link></td>
                  <td className="px-4 py-3 text-slate-700">{b.customer?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatPaise(b.totalPaise)}</td>
                  <td className="px-4 py-3"><span className={`badge ${b.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalonBills;
