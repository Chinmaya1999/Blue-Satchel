import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Coins,
  Check,
  AlertCircle,
  ShieldCheck,
  ScanFace,
  Zap,
  Crosshair,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { loadRazorpay } from "../utils/razorpay.js";
import { DEFAULT_SCAN_COSTS, isUnlimited } from "../utils/credits.js";


const SCAN_TYPES = [
  { key: "detailed", name: "Detailed Scan", icon: ScanFace },
  { key: "quick", name: "Quick Scan", icon: Zap },
  { key: "focus", name: "Focus Scan", icon: Crosshair },
];

const TXN_LABEL = {
  purchase: "Credit purchase",
  scan: "Scan",
  refund: "Refund",
  adjustment: "Adjustment",
};

const describeTxn = (t) => {
  if (t.type === "purchase") return `${t.plan?.name} plan · $${t.amountUsd}${t.paymentReference ? ` · ${t.paymentReference}` : ""}`;
  if (t.type === "scan") return `${t.scanMode} scan`;
  if (t.type === "refund") return `${t.scanMode} scan failed — credits returned`;
  return t.note || "Adjusted by support";
};

const Credits = () => {
  const { user, setCredits } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const need = Number(params.get("need")) || null;
  const next = params.get("next");

  const [plans, setPlans] = useState([]);
  const [costs, setCosts] = useState(DEFAULT_SCAN_COSTS);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [payment, setPayment] = useState(undefined); // { keyId, currency } | null (not configured)
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(null); // { credits, plan }

  const balance = user?.credits ?? 0;
  const unlimited = isUnlimited(user);

  const loadHistory = () =>
    api
      .get("/credits/me")
      .then(({ data }) => {
        setTransactions(data.transactions);
        setCredits(data.credits.balance);
      })
      .catch(() => {});

  useEffect(() => {
    api.get("/credits/plans").then(({ data }) => {
      setPlans(data.plans);
      setCosts(data.costs);
      setPayment(data.payment);
      // Preselect the smallest plan that covers what they came here for.
      if (need) setSelected(data.plans.find((p) => p.credits + balance >= need)?.id || null);
    });
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = plans.find((p) => p.id === selected);
  const pollRef = useRef(null);
  const doneRef = useRef(false);
  const redirectRef = useRef(null);

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearTimeout(redirectRef.current);
  }, []);

  // Runs once per payment, whether Checkout's callback or our status poll sees it first.
  const finishPayment = (plan, balance) => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(pollRef.current);
    setCredits(balance);
    setSuccess({ plan, balance });
    setSelected(null);
    setError("");
    setPaying(false);
    loadHistory();
    // Send them on to their scan (or back to where they were headed).
    redirectRef.current = setTimeout(() => navigate(next || "/scan", { replace: true }), 2000);
  };

  // Razorpay flow: our server creates the order (price from its own plan
  // list), Checkout takes the payment, and our server verifies Razorpay's
  // signature before adding any credits.
  const pay = async () => {
    if (!plan) return;
    setError("");
    setPaying(true);
    doneRef.current = false;
    clearInterval(pollRef.current);
    try {
      if (!(await loadRazorpay())) throw new Error("Couldn't load Razorpay. Check your connection and try again.");
      const { data } = await api.post("/credits/order", { planId: plan.id });

      const checkout = new window.Razorpay({
        key: data.keyId,
        order_id: data.order.id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Blue Satchel",
        description: `${plan.name} plan · ${plan.credits} scan credits`,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        notes: { planId: plan.id },
        theme: { color: "#22d3ee" },
        handler: async (response) => {
          try {
            const { data: verified } = await api.post("/credits/verify", response);
            finishPayment(plan, verified.credits.balance);
          } catch (err) {
            if (!doneRef.current) {
              setError(err.response?.data?.message || "We couldn't confirm your payment. If you were charged, contact support.");
              setPaying(false);
            }
          }
        },
        modal: {
          // Keep polling a little after the window closes: UPI payments can land just after.
          ondismiss: () => {
            setTimeout(() => {
              clearInterval(pollRef.current);
              if (!doneRef.current) setPaying(false);
            }, 30000);
          },
        },
      });
      checkout.on("payment.failed", (resp) => {
        const reason = resp.error?.description || "Payment failed.";
        setError(`${reason} You can try again.`);
        api
          .post("/credits/failed", { orderId: data.order.id, paymentId: resp.error?.metadata?.payment_id, reason })
          .catch(() => {});
      });
      checkout.open();

      // UPI QR / app payments don't always fire Checkout's callback, so also
      // ask the server whether Razorpay has captured this order.
      pollRef.current = setInterval(async () => {
        try {
          const { data: status } = await api.get(`/credits/order/${data.order.id}/status`);
          if (status.paid) {
            checkout.close?.();
            finishPayment(plan, status.credits.balance);
          }
        } catch {
          /* keep polling */
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Couldn't start the payment. Please try again.");
      setPaying(false);
    }
  };

  const nextAffordable = !next || !need || success?.balance >= need;

  return (
    <div className="fs-page fs-page-bg">
      <div className="container-app py-12">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fs-eyebrow">Scan credits</p>
            <h1 className="fs-page-title mt-3">
              Buy <span className="fs-gradient-text">credits</span>
            </h1>
            <p className="fs-page-sub">Credits never expire. Spend them on any scan, any time.</p>
          </div>
          <div className="card flex items-center gap-3 rounded-2xl px-5 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200 ring-1 ring-amber-300/30">
              <Coins size={19} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your balance</p>
              <p className="font-display text-2xl font-bold text-white">
                {unlimited ? "Unlimited" : `${balance} credits`}
              </p>
            </div>
          </div>
        </div>

        {/* Why they landed here */}
        {need && !success && !unlimited && balance < need && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl bg-amber-300/10 p-4 text-sm text-amber-100 ring-1 ring-amber-300/25">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p>
              This scan needs <b>{need} credits</b> and you have <b>{balance}</b>. Choose a plan below to continue — you'll
              go straight back to your scan after paying.
            </p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-emerald-400/10 p-5 ring-1 ring-emerald-300/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-300" />
              <div>
                <p className="font-semibold text-white">
                  {success.plan.credits} credits added — {success.plan.name} plan
                </p>
                <p className="text-sm text-slate-300">Your balance is now {success.balance} credits. Taking you to your scan…</p>
              </div>
            </div>
            {next && nextAffordable ? (
              <button onClick={() => navigate(next)} className="btn-primary h-11 rounded-full px-6">
                Continue to scan <ArrowRight size={16} />
              </button>
            ) : (
              <Link to="/scan" className="btn-primary h-11 rounded-full px-6">
                Choose a scan <ArrowRight size={16} />
              </Link>
            )}
          </div>
        )}

        {/* Plans */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {plans.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelected(p.id);
                  setSuccess(null);
                  setError("");
                }}
                className={`card relative flex flex-col rounded-3xl p-5 text-left transition duration-300 hover:-translate-y-1 ${
                  active ? "ring-2 ring-cyan-300 shadow-[0_0_40px_-10px_rgba(94,231,255,0.6)]" : "ring-1 ring-white/10"
                }`}
              >
                {(p.popular || p.bestValue) && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-cyan-300 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-950">
                    {p.popular ? "Popular" : "Best value"}
                  </span>
                )}
                <p className="text-sm font-semibold text-slate-300">{p.name}</p>
                <p className="mt-2 font-display text-4xl font-extrabold text-white">${p.priceUsd}</p>
                {p.charge?.currency === "INR" && <p className="text-xs font-medium text-slate-400">₹{p.charge.amount}</p>}
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-amber-200">
                  <Coins size={14} /> {p.credits} credits
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{((p.priceUsd / p.credits) * 100).toFixed(1)}¢ per credit</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-xs text-slate-400">
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-300" /> {Math.floor(p.credits / costs.detailed)} detailed scans
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-300" />{" "}
                    {costs.quick === 0 ? "+ unlimited free quick scans" : `or ${Math.floor(p.credits / costs.quick)} quick scans`}
                  </li>
                </ul>
                <span className={`mt-5 inline-flex h-10 items-center justify-center rounded-full text-sm font-semibold ${active ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-white ring-1 ring-white/10"}`}>
                  {active ? "Selected" : "Choose"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Payment */}
        {plan && (
          <div className="card mt-8 grid gap-6 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Secure payment with Razorpay</h2>
              <p className="mt-2 text-sm text-slate-400">
                {payment?.currency === "INR"
                  ? "Pay by card, UPI, netbanking or wallet in Razorpay's secure checkout."
                  : "Pay by debit or credit card in Razorpay's secure checkout."}{" "}
                Your credits are added the moment the payment is confirmed.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> Card details go to Razorpay only — never to Blue Satchel</li>
                <li className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> Every payment is verified on our server before credits are added</li>
              </ul>
              {payment === null && (
                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-400/25">
                  <AlertCircle size={15} /> Payments aren't available right now. Please try again later.
                </div>
              )}
              {payment?.currency === "INR" && (
                <p className="mt-4 text-xs text-slate-400">
                  Charged in Indian rupees at ₹{payment.usdInrRate} per $1.
                </p>
              )}
              {payment?.keyId?.startsWith("rzp_test_") && (
                <p className="mt-4 text-xs text-amber-200/80">Test mode — no real money is charged.</p>
              )}

              {error && (
                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-400/25">
                  <AlertCircle size={15} /> {error}
                </div>
              )}
            </div>

            <div className="h-fit rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
              <h3 className="font-display font-semibold text-white">Summary</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400"><span>{plan.name} plan</span><span>${plan.priceUsd}</span></div>
                <div className="flex justify-between text-slate-400"><span>Credits</span><span>+{plan.credits}</span></div>
                <div className="flex justify-between text-slate-400">
                  <span>Balance after</span>
                  <span>{unlimited ? "Unlimited" : balance + plan.credits}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-3 font-display text-lg font-bold text-white">
                  <span>Total</span>
                  <span className="fs-gradient-text">
                    {plan.charge?.currency === "INR" ? `₹${plan.charge.amount}` : `$${plan.priceUsd}`}
                  </span>
                </div>
              </div>
              <button type="button" onClick={pay} disabled={paying || !payment} className="btn-primary mt-5 h-12 w-full rounded-full disabled:opacity-60">
                {paying ? (
                  <><Loader2 size={16} className="animate-spin" /> Waiting for payment…</>
                ) : (
                  `Pay ${plan.charge?.currency === "INR" ? `₹${plan.charge.amount}` : `$${plan.priceUsd}`} with Razorpay`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Scan costs */}
        <div className="mt-12">
          <p className="fs-eyebrow">What credits buy</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {SCAN_TYPES.map((s) => (
              <div key={s.key} className="card flex items-center gap-4 rounded-2xl p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/30">
                  <s.icon size={20} />
                </span>
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-sm text-amber-200">{costs[s.key] === 0 ? "Free right now" : `${costs[s.key]} credits per scan`}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles size={12} /> If a scan's analysis fails, its credits are returned automatically.
          </p>
        </div>

        {/* History */}
        <div className="card mt-12 rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold text-white">Credit history</h2>
          {transactions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No credit activity yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Details</th>
                    <th className="py-2 pr-4 text-right">Credits</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((t) => (
                    <tr key={t._id}>
                      <td className="py-3 pr-4 text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-200">
                        {TXN_LABEL[t.type]}
                        {t.paymentStatus === "failed" && <span className="ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">Declined</span>}
                      </td>
                      <td className="py-3 pr-4 capitalize text-slate-400">{describeTxn(t)}</td>
                      <td className={`py-3 pr-4 text-right font-semibold tabular-nums ${t.amount > 0 ? "text-emerald-300" : t.amount < 0 ? "text-rose-300" : "text-slate-500"}`}>
                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                      </td>
                      <td className="py-3 text-right tabular-nums text-slate-400">{t.balanceAfter ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Credits;
