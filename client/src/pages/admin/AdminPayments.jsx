import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Coins, Users, XCircle, ScanFace, Wallet, Search, Zap, Loader2 } from "lucide-react";
import api from "../../api/axios.js";
import Loader from "../../components/Loader.jsx";
import { usePricing } from "../../context/PricingContext.jsx";
import PlanManager from "./PlanManager.jsx";

const TYPES = [
  { id: "", label: "All activity" },
  { id: "purchase", label: "Purchases" },
  { id: "scan", label: "Scan charges" },
  { id: "refund", label: "Refunds" },
  { id: "adjustment", label: "Adjustments" },
];

const TYPE_STYLE = {
  purchase: "bg-emerald-50 text-emerald-700",
  scan: "bg-sky-50 text-sky-700",
  refund: "bg-amber-50 text-amber-700",
  adjustment: "bg-violet-50 text-violet-700",
};

const Stat = ({ icon: Icon, label, value, hint, accent }) => (
  <div className="card p-4">
    <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
      <Icon size={17} />
    </div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="font-display text-xl font-bold text-slate-900">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const details = (t) => {
  if (t.type === "purchase") {
    return (
      <>
        {t.plan?.name} · ${t.amountUsd} · <span className="uppercase">{t.paymentMethod}</span>
        {t.paymentReference && <span className="block font-mono text-[10px] text-slate-400">{t.paymentReference}</span>}
        {t.paymentStatus === "failed" && t.paymentMessage && (
          <span className="block text-[11px] text-rose-500">{t.paymentMessage}</span>
        )}
      </>
    );
  }
  if (t.type === "scan") {
    return (
      <>
        <span className="capitalize">{t.scanMode}</span> scan
        {t.scan && (
          <Link to={`/admin/scan-report/${t.scan}`} className="ml-2 text-xs font-semibold text-brand-600 hover:underline">
            View report
          </Link>
        )}
      </>
    );
  }
  if (t.type === "refund") return <><span className="capitalize">{t.scanMode}</span> scan failed — credits returned</>;
  return (
    <>
      {t.note}
      {t.createdBy?.name && <span className="block text-[11px] text-slate-400">by {t.createdBy.name}</span>}
    </>
  );
};

// Admin switch: make a scan mode free for everyone, or charge credits for it.
const ScanPricing = ({ mode, label, settingKey, otherLabel }) => {
  const { refreshPricing } = usePricing();
  const [state, setState] = useState(null); // { settings, baseCosts }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/settings").then(({ data }) => setState(data)).catch(() => setError("Couldn't load settings."));
  }, []);

  const setFree = async (isFree) => {
    const verb = isFree ? "FREE for everyone" : `PAID (${state.baseCosts[mode]} credits per scan)`;
    if (!window.confirm(`Make ${label} ${verb}? This applies to all customers straight away.`)) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch("/admin/settings", { [settingKey]: isFree });
      setState(data);
      refreshPricing();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the change.");
    } finally {
      setSaving(false);
    }
  };

  if (!state) {
    return <div className="card p-5 text-sm text-slate-400">{error || `Loading ${label} pricing…`}</div>;
  }

  const free = state.settings[settingKey];
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${free ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
          <Zap size={18} />
        </span>
        <div>
          <h2 className="font-display font-semibold text-slate-900">
            {label} is {free ? <span className="text-emerald-600">free</span> : <span className="text-amber-600">paid</span>}
          </h2>
          <p className="text-sm text-slate-500">
            {free
              ? `Any signed-in customer can run ${label} without credits. ${otherLabel} still needs credits.`
              : `${label} costs ${state.baseCosts[mode]} credits; customers without enough credits are sent to buy some.`}
          </p>
          {state.settings.updatedAt && (
            <p className="mt-0.5 text-xs text-slate-400">
              Last changed {new Date(state.settings.updatedAt).toLocaleString()}
              {state.settings.updatedBy?.name ? ` by ${state.settings.updatedBy.name}` : ""}
            </p>
          )}
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
      <div className="flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label={`${label} pricing`}>
        {[
          { value: true, label: "Free" },
          { value: false, label: `Paid · ${state.baseCosts[mode]} credits` },
        ].map((opt) => (
          <button
            key={opt.label}
            role="radio"
            aria-checked={free === opt.value}
            disabled={saving || free === opt.value}
            onClick={() => setFree(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              free === opt.value
                ? opt.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-amber-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            {saving && free !== opt.value && <Loader2 size={13} className="animate-spin" />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const AdminPayments = () => {
  const [type, setType] = useState("purchase");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/credits", { params: { type, status: type === "purchase" ? status : "", q: query, page } })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [type, status, query, page]);

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-400">Scan pricing</h2>
        <div className="space-y-3">
        <ScanPricing mode="quick" label="Quick Scan" settingKey="quickScanFree" otherLabel="Detailed Scan" />
        <ScanPricing mode="detailed" label="Detailed Scan" settingKey="detailedScanFree" otherLabel="Quick Scan" />
        <ScanPricing mode="focus" label="Focus Scan" settingKey="focusScanFree" otherLabel="Other scans" />
        </div>
      </section>

      {/* Totals */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <Stat icon={DollarSign} label="Credit revenue" value={`$${stats.revenueUsd.toLocaleString()}`} hint={`${stats.purchases} paid purchases`} accent="bg-emerald-50 text-emerald-600" />
          <Stat icon={Users} label="Paying customers" value={stats.payingCustomers} accent="bg-brand-50 text-brand-600" />
          <Stat icon={Coins} label="Credits sold" value={stats.creditsSold.toLocaleString()} accent="bg-amber-50 text-amber-600" />
          <Stat icon={ScanFace} label="Credits spent" value={stats.creditsSpent.toLocaleString()} hint="Net of refunds" accent="bg-sky-50 text-sky-600" />
          <Stat icon={Wallet} label="Unspent balance" value={stats.creditsOutstanding.toLocaleString()} hint="Across all users" accent="bg-violet-50 text-violet-600" />
          <Stat icon={XCircle} label="Declined payments" value={stats.failedPurchases} hint={`${stats.pendingPurchases} abandoned checkouts`} accent="bg-rose-50 text-rose-600" />
        </div>
      )}

      {/* Plans (manage + sales) / credits by scan type */}
      {stats && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <PlanManager />
          <div className="card p-5">
            <h2 className="mb-3 font-display font-semibold text-slate-900">Credits spent by scan type</h2>
            <ul className="space-y-3">
              {["detailed", "quick", "focus"].map((mode) => (
                <li key={mode} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-700">{mode} scan</span>
                  <span className="text-slate-500">
                    {stats.byMode[mode]?.scans || 0} scans ·{" "}
                    <span className="font-semibold text-slate-900">{(stats.byMode[mode]?.credits || 0).toLocaleString()} credits</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Ledger */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-slate-900">Credit transactions</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQuery(q.trim());
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email, phone or payment ref"
                className="input w-64 py-2 pl-8 text-sm"
              />
            </div>
          </form>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setType(t.id);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                type === t.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
          {type === "purchase" && (
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              <option value="">All purchases</option>
              <option value="paid">Paid</option>
              <option value="failed">Declined</option>
              <option value="pending">Abandoned / pending</option>
            </select>
          )}
        </div>

        {loading && !data ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Details</th>
                  <th className="py-2 pr-4 text-right">Credits</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-50 ${loading ? "opacity-60" : ""}`}>
                {data?.items.map((t) => (
                  <tr key={t._id} className="align-top hover:bg-slate-50">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      {t.user ? (
                        <Link to={`/admin/customers/${t.user._id}`} className="font-medium text-slate-800 hover:text-brand-600">
                          {t.user.name}
                          <span className="block text-xs font-normal text-slate-400">{t.user.email}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Deleted user</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge capitalize ${TYPE_STYLE[t.type]}`}>{t.type}</span>
                      {t.paymentStatus === "failed" && <span className="badge ml-1 bg-rose-50 text-rose-700">Declined</span>}
                      {t.paymentStatus === "pending" && <span className="badge ml-1 bg-slate-100 text-slate-600">Pending</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{details(t)}</td>
                    <td className={`py-3 pr-4 text-right font-semibold tabular-nums ${t.amount > 0 ? "text-emerald-600" : t.amount < 0 ? "text-rose-600" : "text-slate-400"}`}>
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </td>
                    <td className="py-3 text-right tabular-nums text-slate-500">{t.balanceAfter ?? "—"}</td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No transactions match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data?.pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>{data.total} transactions · page {data.page} of {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary py-1.5 text-xs disabled:opacity-40">Previous</button>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary py-1.5 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayments;
