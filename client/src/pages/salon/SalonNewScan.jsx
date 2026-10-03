import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Camera, Loader2, ScanFace, Upload, UserRound } from "lucide-react";
import CameraCapture from "../../components/salon/CameraCapture.jsx";
import api from "../../api/axios.js";
import { SCAN_MODES, formatPaise } from "../../utils/money.js";
import { useSiteSettings } from "../../context/SiteSettingsContext.jsx";

const NEEDS = { quick: ["front"], focus: ["front"], detailed: ["front", "left", "right"] };
const LABEL = { front: "Front", left: "Left side", right: "Right side" };

// Scan one of the salon's customers. The salon pays the credits; the customer
// is recorded against the scan so a bill and report can be made for them.
const SalonNewScan = () => {
  const { salon, credits, planPurchased, reload } = useOutletContext();
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const isOn = (key) => settings[`${key}ScanEnabled`] !== false;
  const [mode, setMode] = useState("focus");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [consent, setConsent] = useState(false);
  const [cameraFor, setCameraFor] = useState(null); // angle being captured live
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previewsRef = useRef({});
  previewsRef.current = previews;
  useEffect(() => () => Object.values(previewsRef.current).forEach(URL.revokeObjectURL), []);

  // If the chosen scan gets switched off, fall back to one that's still on.
  useEffect(() => {
    if (!isOn(mode)) {
      const next = SCAN_MODES.find((m) => isOn(m.key));
      if (next) setMode(next.key);
    }
  }, [settings, mode]);
  const anyOn = SCAN_MODES.some((m) => isOn(m.key));
  const cost = credits.costs[mode];
  const enough = credits.unlimited || credits.balance >= cost;

  const setPhoto = (angle, file) => {
    if (!file) return;
    if (previews[angle]) URL.revokeObjectURL(previews[angle]);
    setPhotos((p) => ({ ...p, [angle]: file }));
    setPreviews((p) => ({ ...p, [angle]: URL.createObjectURL(file) }));
  };
  const pick = (angle) => (e) => {
    setPhoto(angle, e.target.files?.[0]);
    e.target.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const missing = NEEDS[mode].filter((a) => !photos[a]);
    if (missing.length) return setError(`Add the ${missing.map((a) => LABEL[a].toLowerCase()).join(" and ")} photo.`);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("mode", mode);
      form.append("customerName", customer.name);
      form.append("customerPhone", customer.phone);
      form.append("customerEmail", customer.email);
      form.append("consent", String(consent));
      for (const a of NEEDS[mode]) form.append(a, photos[a]);
      const { data } = await api.post("/salon/scans", form);
      await reload();
      navigate(`/salon/scans/${data.scan._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "The scan failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Scan a customer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Take a clear, front-facing photo in even light.{" "}
          {cost === 0 ? <b className="text-emerald-600">This scan is free right now.</b> : <>You have <b>{credits.balance}</b> credits.</>}
        </p>
      </div>

      {!planPurchased && cost > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          You need scan credits first. <Link to="/salon/pricing" className="font-semibold underline">See plans & buy →</Link>
        </p>
      )}

      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><UserRound size={16} /> Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input className="input mt-1" required maxLength={80} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input mt-1" type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input mt-1" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ScanFace size={16} /> Scan type</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCAN_MODES.map((m) => (
            <button
              type="button"
              key={m.key}
              onClick={() => isOn(m.key) && setMode(m.key)}
              disabled={!isOn(m.key)}
              className={`rounded-xl p-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${mode === m.key ? "bg-brand-50 ring-brand-500" : "bg-white ring-slate-200 hover:ring-slate-300"}`}
            >
              <p className="text-sm font-semibold text-slate-800">{m.label}</p>
              <p className="text-xs text-slate-500">{!isOn(m.key) ? "Unavailable right now" : credits.costs[m.key] === 0 ? "Free" : `${credits.costs[m.key]} credits`} · you charge {formatPaise(salon.scanPrices[m.key])}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {NEEDS[mode].map((angle) => (
            <div key={angle} className="space-y-2">
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                {previews[angle] ? (
                  <img src={previews[angle]} alt={LABEL[angle]} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-medium">{LABEL[angle]} photo</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setCameraFor(angle)} className="btn-secondary rounded-xl px-2 py-2 text-xs"><Camera size={14} /> Camera</button>
                <label className="btn-secondary cursor-pointer rounded-xl px-2 py-2 text-xs">
                  <Upload size={14} /> Upload
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick(angle)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        The customer has agreed to their face photo being analysed by AI and to the report being shared with them. This is a cosmetic assessment, not a medical diagnosis.
      </label>

      {!anyOn && <p className="text-sm text-rose-600">All scan services are unavailable right now. Please check back later.</p>}
      {!enough && <p className="text-sm text-rose-600">This scan needs {cost} credits. <Link to="/salon/pricing" className="font-semibold underline">Buy a plan</Link></p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <button disabled={busy || !enough || !isOn(mode)} className="btn-primary rounded-full">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Analysing… this can take a minute</> : <><ScanFace size={16} /> Run scan{cost > 0 ? ` (${cost} credits)` : " (free)"}</>}
      </button>
      {cameraFor && (
        <CameraCapture label={`${LABEL[cameraFor]} photo`} onCapture={(file) => setPhoto(cameraFor, file)} onClose={() => setCameraFor(null)} />
      )}
    </form>
  );
};

export default SalonNewScan;
