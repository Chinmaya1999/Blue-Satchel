import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";

const AdminCustomers = () => {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get("/admin/customers", { params: { q }, signal: controller.signal })
      .then(({ data }) => setItems(data.items))
      .catch((e) => { if (e.name !== "CanceledError") console.error(e); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [q]);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-slate-900">Customer Lookup</h2>
        <div className="relative w-64 max-w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input py-2 pl-9 text-sm" placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Skin Type</th>
                <th className="py-2 pr-4">Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-800">{c.name}</td>
                  <td className="py-3 pr-4 text-slate-500">{c.email}</td>
                  <td className="py-3 pr-4 capitalize text-slate-500">{c.skinType}</td>
                  <td className="py-3 pr-4 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-right">
                    <Link to={`/admin/customers/${c._id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                      View <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
