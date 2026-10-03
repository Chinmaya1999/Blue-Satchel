import { Link, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, Lock, Save, CheckCircle2 } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { formatPaise, paiseToRupees, rupeesToPaise, SCAN_MODES } from "../../utils/money.js";

const SalonPricing = () => {
  const { reload } = useOutletContext();
  const [data, setData] = useState(null);
  const [prices, setPrices] = useState({ quick: "", focus: "", detailed: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get("/salon/pricing").then(({ data }) => {
      setData(data);
      setPrices({
        quick: paiseToRupees(data.scanPrices.quick),
        focus: paiseToRupees(data.scanPrices.focus),
        detailed: paiseToRupees(data.scanPrices.detailed),
      });
    });
  }, []);

  if (!data) return <Loader label="Loading pricing…" />;

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    const body = {};
    for (const m of SCAN_MODES) {
      const p = rupeesToPaise(prices[m.key]);
      if (p === null) return setMsg({ error: `Enter a valid price for ${m.label}.` });
      body[m.key] = p;
    }
    setBusy(true);
    try {
      await api.put("/salon/scan-prices", body);
      await reload();
      setMsg({ ok: "Customer scan prices saved." });
    } catch (err) {
      setMsg({ error: err.response?.data?.message || "Couldn't save prices." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Plans & scan pricing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every scan uses credits from your plan. Here is what each scan costs you, per plan, in rupees and paise. Pick a plan, then set the price you charge your own customers.
        </p>
      </div>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Credits</th>
              {SCAN_MODES.map((m) => (
                <th key={m.key} className="px-4 py-3">{m.label.replace(" (3 angles)", "")}<span className="block normal-case text-[10px] text-slate-300">your cost / scan</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.plans.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {p.name}
                  {p.popular && <span className="badge ml-2 bg-brand-50 text-[10px] text-brand-700">Popular</span>}
                  {p.bestValue && <span className="badge ml-2 bg-emerald-50 text-[10px] text-emerald-700">Best value</span>}
                </td>
                <td className="px-4 py-3">{formatPaise(p.pricePaise)}</td>
                <td className="px-4 py-3">{p.credits}</td>
                {SCAN_MODES.map((m) => (
                  <td key={m.key} className="px-4 py-3">
                    {p.scanPaise[m.key] === 0 ? (
                      <span className="font-semibold text-emerald-600">Free</span>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800">{formatPaise(p.scanPaise[m.key])}</span>
                        <span className="block text-[11px] text-slate-400">{p.scanPaise[m.key]} paise</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Scan credit cost: {SCAN_MODES.map((m) => `${m.label.split(" ")[0]} ${data.costs[m.key]}`).join(" · ")}. You have <b>{data.credits.balance}</b> credits.
          </span>
          <Link to="/credits" className="btn-primary rounded-full">Buy a plan</Link>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800">What you charge your customers</h2>
        {!data.planPurchased ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <Lock size={18} className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              Buy a pricing plan above to unlock your own customer prices. <Link to="/credits" className="font-semibold text-brand-600 hover:underline">Buy a plan →</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={save} className="mt-3 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {SCAN_MODES.map((m) => (
                <div key={m.key}>
                  <label className="label">{m.label}</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                    <input
                      className="input pl-7"
                      inputMode="decimal"
                      value={prices[m.key]}
                      onChange={(e) => setPrices({ ...prices, [m.key]: e.target.value })}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    = {rupeesToPaise(prices[m.key]) ?? 0} paise · you pay ~{formatPaise(data.plans[0]?.scanPaise[m.key] ?? 0)} on {data.plans[0]?.name}
                  </p>
                </div>
              ))}
            </div>
            {msg?.error && <p className="text-sm text-rose-600">{msg.error}</p>}
            <div className="flex items-center gap-3">
              <button disabled={busy} className="btn-primary rounded-full">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save prices
              </button>
              {msg?.ok && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 size={16} /> {msg.ok}</span>}
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default SalonPricing;
