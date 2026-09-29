import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Loader2, Check, MapPin } from "lucide-react";
import AuthShell, { Field } from "../components/landing/AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import GoogleSignIn from "../components/GoogleSignIn.jsx";
import { getBrowserLocation } from "../utils/geo.js";

const STAGES = [
  { preset: "capture", label: "1 · Take a selfie", detail: "Scanned line by line in seconds" },
  { preset: "landmarks", label: "2 · Face mapped", detail: "68 landmarks locked onto your features" },
  { preset: "mesh", label: "3 · 3D skin mesh", detail: "Seven skin zones, judged separately" },
  { preset: "heat", label: "4 · Concerns scored", detail: "Oil · redness · dark circles · spots" },
  {
    preset: "result",
    label: "5 · Your routine",
    detail: "Products matched to your results",
    callouts: [{ at: "forehead", label: "Skin score", value: "Ready", side: "right", len: 70 }],
  },
];

const PERKS = ["Free AI skin analysis", "Personal product routine", "Track progress over time"];

const strengthOf = (pw) => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(s, 1);
};
const STRENGTH = [
  null,
  { label: "Weak", color: "bg-rose-400" },
  { label: "Fair", color: "bg-amber-400" },
  { label: "Good", color: "bg-cyan-300" },
  { label: "Strong", color: "bg-emerald-400" },
];

const Register = () => {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = strengthOf(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Asks the browser for location; if declined, the server falls back to
      // an approximate location from the request IP.
      const location = await getBrowserLocation();
      const data = await register({ ...form, location });
      // New accounts must enter the 6-digit code from their welcome email.
      navigate("/verify-email?next=/scan", { state: { emailSent: data.verification?.emailSent } });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (credential) => {
    setError("");
    setLoading(true);
    try {
      const location = await getBrowserLocation();
      await googleLogin(credential, location);
      navigate("/scan");
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <AuthShell
      stages={STAGES}
      eyebrow="Create account"
      title="Meet your skin"
      subtitle="Create a free account and get your first 3D skin analysis in under a minute."
      error={error}
    >
      <ul className="mt-5 flex flex-wrap gap-2">
        {PERKS.map((p) => (
          <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-300 ring-1 ring-white/10">
            <Check size={12} className="text-emerald-300" /> {p}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field icon={User} label="Full name" required autoComplete="name" value={form.name} onChange={set("name")} />
        <Field icon={Mail} label="Email address" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        <Field
          icon={Phone}
          label="Phone number"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          pattern="\+?[0-9 \-]{10,18}"
          title="Enter a valid phone number (10–15 digits, optional + country code)"
          value={form.phone}
          onChange={set("phone")}
        />
        <div>
          <Field
            icon={Lock}
            label="Password (min. 6 characters)"
            type={show ? "text" : "password"}
            required
            minLength={6}
            maxLength={72}
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
            right={
              <button type="button" onClick={() => setShow((v) => !v)} className="fs-field-action" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <div className={`grid transition-all duration-300 ${form.password ? "mt-2.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= strength ? STRENGTH[strength].color : "bg-white/10"}`} />
                ))}
              </div>
              <span className="w-12 text-right text-[11px] font-medium text-slate-400">{STRENGTH[strength]?.label}</span>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="fs-btn-primary group mt-2 w-full justify-center disabled:opacity-60">
          {loading ? (
            <><Loader2 size={17} className="animate-spin" /> Creating account…</>
          ) : (
            <>Create account & start scan <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>
          )}
        </button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <MapPin size={12} className="mt-0.5 shrink-0" />
          We'll ask for your location to find dermatologists near you. If you don't allow it, we use an approximate
          location based on your internet connection.
        </p>
      </form>

      <GoogleSignIn onCredential={onGoogle} text="signup_with" />

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-cyan-300 transition hover:text-cyan-200">Sign in</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
