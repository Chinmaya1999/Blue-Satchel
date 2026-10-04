import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Camera, MapPin, Trash2, Stethoscope, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const POINTS = [
  [Camera, "Your face photos are sent to our AI analysis providers to produce your skin report, and saved in your scan history."],
  [MapPin, "Your location is used only to suggest dermatologists near you."],
  [Trash2, "You can delete your scans and account any time from Profile → Your data & privacy."],
  [Stethoscope, "Results are cosmetic guidance, not a medical diagnosis. See a dermatologist for any skin concern."],
];

// Shown once, before a customer's first scan. The server refuses scans until
// consent is recorded.
const ScanConsent = () => {
  const { acceptPhotoConsent } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      await acceptPhotoConsent();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your choice. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fs-page fs-page-bg">
      <div className="container-app max-w-xl py-14">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/25">
          <ShieldCheck size={26} />
        </span>
        <p className="fs-eyebrow mt-6">Before your first scan</p>
        <h1 className="fs-page-title mt-3">Your photos, <span className="fs-gradient-text">your control</span></h1>
        <ul className="mt-6 space-y-3">
          {POINTS.map(([Icon, text]) => (
            <li key={text} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4 text-sm text-slate-300 ring-1 ring-white/10">
              <Icon size={17} className="mt-0.5 shrink-0 text-cyan-300" /> {text}
            </li>
          ))}
        </ul>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-300" />
          <span>
            I agree to DXB BEAUTY analysing my face photos as described above, and I've read the{" "}
            <Link to="/privacy" className="text-cyan-300 hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <button type="button" onClick={accept} disabled={!agreed || busy} className="btn-primary mt-6 h-12 w-full rounded-full disabled:opacity-50">
          {busy ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Agree & continue to scan"}
        </button>
      </div>
    </div>
  );
};

export default ScanConsent;
