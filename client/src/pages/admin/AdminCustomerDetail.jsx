import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Mail, Phone } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";

const AdminCustomerDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/admin/customers/${id}`).then(({ data }) => setData(data));
  }, [id]);

  if (!data) return <Loader label="Loading customer…" />;
  const { customer, scans, orders } = data;

  return (
    <div className="space-y-6">
      <Link to="/admin/customers" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ChevronLeft size={15} /> Back to customers
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
            {customer.name?.[0]?.toUpperCase()}
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{customer.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-slate-500"><Mail size={13} /> {customer.email}</p>
            {customer.phone && <p className="flex items-center gap-1.5 text-sm text-slate-500"><Phone size={13} /> {customer.phone}</p>}
          </div>
          <span className="badge ml-auto bg-brand-50 capitalize text-brand-700">{customer.skinType}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-display font-semibold text-slate-900">Scan History ({scans.length})</h3>
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {scans.map((s) => (
              <li key={s._id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                <img src={s.imageUrl} className="h-10 w-10 rounded-lg object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-slate-800">{s.overallScore}/100 · {s.overallLabel}</p>
                  <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
            {scans.length === 0 && <p className="text-sm text-slate-400">No scans recorded.</p>}
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-display font-semibold text-slate-900">Orders ({orders.length})</h3>
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {orders.map((o) => (
              <li key={o._id} className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{o.orderNumber}</p>
                  <p className="text-xs capitalize text-slate-400">{o.status}</p>
                </div>
                <span className="font-semibold text-slate-700">₹{o.total}</span>
              </li>
            ))}
            {orders.length === 0 && <p className="text-sm text-slate-400">No orders placed.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerDetail;
