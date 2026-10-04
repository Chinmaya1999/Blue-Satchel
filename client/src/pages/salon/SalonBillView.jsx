import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, CheckCircle2 } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { formatPaise } from "../../utils/money.js";

// Printable invoice (use the browser's Print → Save as PDF to download).
const SalonBillView = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/salon/bills/${id}`).then(({ data }) => setData(data));
  }, [id]);
  if (!data) return <Loader label="Loading bill…" />;
  const { bill, salon } = data;

  const setStatus = async (status, paymentMethod) => {
    setBusy(true);
    try {
      const { data: res } = await api.patch(`/salon/bills/${id}`, { status, paymentMethod });
      setData({ ...data, bill: res.bill });
    } finally {
      setBusy(false);
    }
  };

  const addr = [salon.address?.line1, salon.address?.line2, salon.address?.city, salon.address?.state, salon.address?.postalCode].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/salon/bills" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> All bills</Link>
        <div className="flex flex-wrap items-center gap-2">
          {bill.status === "unpaid" ? (
            <>
              {["cash", "upi", "card"].map((m) => (
                <button key={m} disabled={busy} onClick={() => setStatus("paid", m)} className="btn-secondary rounded-full capitalize">Paid by {m}</button>
              ))}
            </>
          ) : (
            <button disabled={busy} onClick={() => setStatus("unpaid")} className="btn-secondary rounded-full">Mark unpaid</button>
          )}
          <button onClick={() => window.print()} className="btn-primary rounded-full"><Printer size={16} /> Print / Save PDF</button>
        </div>
      </div>

      <article className="card bg-white p-8 print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            {salon.logoUrl && <img src={salon.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />}
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">{salon.name}</h1>
              <p className="max-w-xs text-xs text-slate-500">{addr}</p>
              <p className="text-xs text-slate-500">{[salon.phone, salon.email].filter(Boolean).join(" · ")}</p>
              {salon.gstin && <p className="text-xs text-slate-500">GSTIN: {salon.gstin}</p>}
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-display text-lg font-bold text-slate-900">INVOICE</p>
            <p className="text-slate-500">{bill.invoiceNumber}</p>
            <p className="text-slate-500">{new Date(bill.createdAt).toLocaleDateString()}</p>
            <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase ${bill.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
              {bill.status === "paid" && <CheckCircle2 size={13} />} {bill.status}{bill.paymentMethod ? ` · ${bill.paymentMethod}` : ""}
            </p>
          </div>
        </header>

        <section className="py-5 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Billed to</p>
          <p className="font-semibold text-slate-800">{bill.customer?.name}</p>
          <p className="text-slate-500">{[bill.customer?.phone, bill.customer?.email].filter(Boolean).join(" · ")}</p>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((i, n) => (
              <tr key={n} className="border-b border-slate-100">
                <td className="py-2.5 capitalize text-slate-700">{i.name}</td>
                <td className="py-2.5 text-right text-slate-500">{i.qty}</td>
                <td className="py-2.5 text-right text-slate-500">{formatPaise(i.unitPaise)}</td>
                <td className="py-2.5 text-right font-medium text-slate-800">{formatPaise(i.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatPaise(bill.subtotalPaise)}</span></div>
          {bill.discountPaise > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span>− {formatPaise(bill.discountPaise)}</span></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 font-display text-lg font-bold text-slate-900"><span>Total</span><span>{formatPaise(bill.totalPaise)}</span></div>
        </div>

        {bill.notes && <p className="mt-6 text-xs text-slate-500">Note: {bill.notes}</p>}
        <p className="mt-8 text-center text-[11px] text-slate-400">Skin analysis is a cosmetic assessment, not a medical diagnosis. Powered by DXB BEAUTY.</p>
      </article>
    </div>
  );
};

export default SalonBillView;
