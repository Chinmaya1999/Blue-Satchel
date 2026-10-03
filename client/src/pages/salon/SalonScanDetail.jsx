import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, Loader2, Receipt, Sparkles, Package, Minus, Plus } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { formatPaise, paiseToRupees, rupeesToPaise } from "../../utils/money.js";

const LEVEL = { Low: "bg-emerald-50 text-emerald-700", Medium: "bg-amber-50 text-amber-700", High: "bg-rose-50 text-rose-700" };

// One customer scan: report, recommended salon products, and the bill.
const SalonScanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [qty, setQty] = useState({}); // productId -> quantity (selected products only)
  const [includeScan, setIncludeScan] = useState(true);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(false);
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/salon/scans/${id}`).then(({ data }) => {
      setData(data);
      const picked = data.scan.salonRecommended?.length ? data.scan.salonRecommended.map(String) : data.suggestedIds;
      setQty(Object.fromEntries(picked.map((pid) => [pid, 1])));
    });
  }, [id]);

  const lines = useMemo(() => {
    if (!data) return [];
    const out = [];
    if (includeScan) out.push({ name: `${data.scan.mode} skin scan`, total: data.salon.scanPrices[data.scan.mode] ?? 0 });
    for (const p of data.products) if (qty[p._id]) out.push({ name: `${p.name} × ${qty[p._id]}`, total: p.pricePaise * qty[p._id] });
    return out;
  }, [data, qty, includeScan]);

  if (!data) return <Loader label="Loading scan…" />;
  const { scan, products, suggestedIds, bill } = data;
  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const discountPaise = Math.min(rupeesToPaise(discount || "0") ?? 0, subtotal);

  const toggle = (pid) =>
    setQty((q) => {
      const next = { ...q };
      if (next[pid]) delete next[pid];
      else next[pid] = 1;
      return next;
    });
  const step = (pid, d) => setQty((q) => ({ ...q, [pid]: Math.min(Math.max((q[pid] || 1) + d, 1), 99) }));

  const saveRecommendations = () => api.put(`/salon/scans/${id}/recommendations`, { productIds: Object.keys(qty) });

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      await saveRecommendations();
      const { data: res } = await api.post(`/salon/scans/${id}/bill`, {
        includeScan,
        items: Object.entries(qty).map(([productId, q]) => ({ productId, qty: q })),
        discountPaise,
        notes,
        status: paid ? "paid" : "unpaid",
        paymentMethod: paid ? method : undefined,
      });
      navigate(`/salon/bills/${res.bill._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create the bill.");
      setBusy(false);
    }
  };

  const sorted = [...scan.concerns].sort((a, b) => b.severity - a.severity);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <img src={scan.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold text-slate-900">{scan.salonCustomer?.name}</h1>
          <p className="text-sm text-slate-500">
            {[scan.salonCustomer?.phone, scan.salonCustomer?.email].filter(Boolean).join(" · ") || "No contact details"} · {new Date(scan.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold text-slate-900">{scan.overallScore}</p>
          <p className="text-xs text-slate-400">{scan.overallLabel}</p>
        </div>
        <Link to={`/scan/${scan._id}`} className="btn-secondary rounded-full"><FileText size={16} /> Full report & download</Link>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Skin concerns</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-700">{c.label}</span>
              <span className={`badge ${LEVEL[c.level]}`}>{c.severity}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Sparkles size={16} className="text-brand-600" /> Recommend your products</h2>
          <p className="mt-1 text-xs text-slate-500">Products matching this customer's concerns are pre-selected. Tick what you recommend; they're added to the bill.</p>
          {products.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">You haven't added any products. <Link to="/salon/products" className="font-semibold text-brand-600 hover:underline">Add products →</Link></p>
          ) : (
            <ul className="mt-4 space-y-2">
              {products.map((p) => (
                <li key={p._id} className={`flex items-center gap-3 rounded-xl p-3 ring-1 transition ${qty[p._id] ? "bg-brand-50/50 ring-brand-300" : "ring-slate-200"}`}>
                  <input type="checkbox" checked={Boolean(qty[p._id])} onChange={() => toggle(p._id)} disabled={Boolean(bill)} />
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <Package size={20} className="text-slate-300" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {p.name} {suggestedIds.includes(p._id) && <span className="badge ml-1 bg-brand-50 text-[10px] text-brand-700">Matches scan</span>}
                    </p>
                    <p className="text-xs text-slate-400">{formatPaise(p.pricePaise)}</p>
                  </div>
                  {qty[p._id] && !bill && (
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => step(p._id, -1)} className="rounded-md p-1 text-slate-500 ring-1 ring-slate-200"><Minus size={12} /></button>
                      <span className="w-5 text-center text-sm">{qty[p._id]}</span>
                      <button type="button" onClick={() => step(p._id, 1)} className="rounded-md p-1 text-slate-500 ring-1 ring-slate-200"><Plus size={12} /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card h-fit p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Receipt size={16} className="text-brand-600" /> Bill</h2>
          {bill ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-slate-500">Invoice <b className="text-slate-800">{bill.invoiceNumber}</b> · <span className="capitalize">{bill.status}</span></p>
              <p className="font-display text-2xl font-bold text-slate-900">{formatPaise(bill.totalPaise)}</p>
              <Link to={`/salon/bills/${bill._id}`} className="btn-primary rounded-full">Open bill</Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={includeScan} onChange={(e) => setIncludeScan(e.target.checked)} /> Charge for the scan ({formatPaise(data.salon.scanPrices[scan.mode])})
              </label>
              <ul className="space-y-1 border-y border-slate-100 py-3">
                {lines.length === 0 && <li className="text-slate-400">Nothing added yet.</li>}
                {lines.map((l) => (
                  <li key={l.name} className="flex justify-between gap-3">
                    <span className="capitalize text-slate-600">{l.name}</span>
                    <span className="text-slate-800">{formatPaise(l.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3">
                <label className="text-slate-500">Discount (₹)</label>
                <input className="input w-28 text-right" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder={paiseToRupees(0)} />
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatPaise(subtotal - discountPaise)}</span>
              </div>
              <textarea className="input min-h-[56px]" placeholder="Note on the bill (optional)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Customer has paid
              </label>
              {paid && (
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              )}
              {error && <p className="text-rose-600">{error}</p>}
              <button onClick={generate} disabled={busy || lines.length === 0} className="btn-primary w-full justify-center rounded-full">
                {busy && <Loader2 size={16} className="animate-spin" />} Generate bill
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SalonScanDetail;
