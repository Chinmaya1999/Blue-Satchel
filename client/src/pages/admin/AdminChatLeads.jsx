import { useEffect, useState } from "react";
import { Search, MessageCircle, AlertTriangle } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";

const AdminChatLeads = () => {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [contactOnly, setContactOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get("/admin/chat-leads", { params: { q: q || undefined, contact: contactOnly ? 1 : undefined, page } })
        .then(({ data }) => setData(data))
        .catch(() => setError("Couldn't load chat leads."));
    }, 250);
    return () => clearTimeout(t);
  }, [q, contactOnly, page]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900">Chatbot leads</h2>
        <p className="text-sm text-slate-500">Visitors who talked to the skin assistant, with the profile and contact details they chose to share.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, email, phone" className="input pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={contactOnly} onChange={(e) => { setContactOnly(e.target.checked); setPage(1); }} />
          Only visitors who shared contact details
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!data && !error && <Loader />}
      {data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Visitor</th>
                <th className="px-4 py-3">Skin profile</th>
                <th className="px-4 py-3">Recommended</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.leads.map((l) => (
                <tr key={l._id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{l.name || "Unknown"}</p>
                    {l.contactConsent ? (
                      <>
                        {l.email && <p className="text-xs text-slate-500">{l.email}</p>}
                        {l.phone && <p className="text-xs text-slate-500">{l.phone}</p>}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">No contact shared</p>
                    )}
                    {l.user && <p className="text-[11px] text-sky-600">Account: {l.user.email}</p>}
                    {l.needsDermatologist && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                        <AlertTriangle size={11} /> Mentioned a medical concern
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p className="capitalize">{l.skinType || "—"}{l.sensitive ? " · sensitive" : ""}</p>
                    <p className="text-xs capitalize text-slate-500">{(l.concerns || []).join(", ") || "No concerns listed"}</p>
                    <p className="text-xs text-slate-400">
                      {l.ageBand ? `Age ${l.ageBand}` : ""}{l.budget ? ` · Budget ${l.budget === "0" ? "no limit" : `₹${l.budget}`}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {l.recommended?.length ? l.recommended.map((p) => <p key={p._id}>{p.name} · ₹{p.price}</p>) : <span className="text-slate-400">{l.completed ? "—" : "Didn't finish"}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(l.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
              {!data.leads.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    <MessageCircle className="mx-auto mb-2" size={22} /> No chats yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data?.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button className="btn-secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminChatLeads;
