import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";

const AdminScans = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/scans").then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5">
      <h2 className="mb-4 font-display font-semibold text-slate-900">Scan History Viewer</h2>
      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Top Concern</th>
                <th className="py-2 pr-4">Recommended</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((s) => {
                const top = [...s.concerns].sort((a, b) => b.severity - a.severity)[0];
                return (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="flex items-center gap-3 py-3 pr-4">
                      <img src={s.imageUrl} className="h-9 w-9 rounded-lg object-cover" />
                      <div>
                        <p className="font-medium text-slate-800">{s.user?.name}</p>
                        <p className="text-xs text-slate-400">{s.user?.email}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-700">{s.overallScore}/100</td>
                    <td className="py-3 pr-4 text-slate-500">{top ? `${top.label} (${top.level})` : "—"}</td>
                    <td className="py-3 pr-4 text-slate-500">{s.recommendedProducts?.length || 0} products</td>
                    <td className="py-3 pr-4 text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">No scans yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminScans;
