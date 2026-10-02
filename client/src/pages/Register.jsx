import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Loader2, Check, MapPin } from "lucide-react";
import AuthShell, { Field } from "../components/landing/AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import GoogleSignIn from "../components/GoogleSignIn.jsx";
import { useLocale } from "../context/LocaleContext.jsx";
import { getBrowserLocation } from "../utils/geo.js";
import { COUNTRIES, countryByCode } from "../utils/countries.js";

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

const PERKS = ["register.perk1", "register.perk2", "register.perk3"];

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
  { label: "register.weak", color: "bg-rose-400" },
  { label: "register.fair", color: "bg-amber-400" },
  { label: "register.good", color: "bg-cyan-300" },
  { label: "register.strong", color: "bg-emerald-400" },
];

const Register = () => {
  const { t, countryCode } = useLocale();
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [dialCode, setDialCode] = useState(countryCode);
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
      const digits = form.phone.replace(/\D/g, "").replace(/^0+/, "");
      const phone = form.phone.trim().startsWith("+") ? `+${form.phone.replace(/\D/g, "")}` : `+${countryByCode(dialCode).dial}${digits}`;
      const data = await register({ ...form, phone, location });
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
      eyebrow={t("register.eyebrow")}
      title={t("register.title")}
      subtitle={t("register.sub")}
      error={error}
    >
      <ul className="mt-5 flex flex-wrap gap-2">
        {PERKS.map((p) => (
          <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-300 ring-1 ring-white/10">
            <Check size={12} className="text-emerald-300" /> {t(p)}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field icon={User} label={t("register.name")} required autoComplete="name" value={form.name} onChange={set("name")} />
        <Field icon={Mail} label={t("auth.email")} type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        <div className="flex gap-2">
          <select
            value={dialCode}
            onChange={(e) => setDialCode(e.target.value)}
            aria-label={t("register.countryCode")}
            className="h-[52px] w-[104px] shrink-0 rounded-2xl bg-white/[0.04] px-2 text-sm text-slate-200 outline-none ring-1 ring-white/10 focus:ring-cyan-300/60"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="text-slate-900">{c.code} +{c.dial}</option>
            ))}
          </select>
          <Field
            icon={Phone}
            label={t("register.phone")}
            type="tel"
            required
            autoComplete="tel-national"
            inputMode="tel"
            pattern="\+?[0-9 \-]{6,18}"
            title="Enter your phone number without the country code"
            value={form.phone}
            onChange={set("phone")}
            className="flex-1"
          />
        </div>
        <div>
          <Field
            icon={Lock}
            label={t("register.password")}
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
              <span className="w-12 text-right text-[11px] font-medium text-slate-400">{STRENGTH[strength] && t(STRENGTH[strength].label)}</span>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="fs-btn-primary group mt-2 w-full justify-center disabled:opacity-60">
          {loading ? (
            <><Loader2 size={17} className="animate-spin" /> {t("register.creating")}</>
          ) : (
            <>{t("register.submit")} <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>
          )}
        </button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <MapPin size={12} className="mt-0.5 shrink-0" />
          {t("register.location")}
        </p>
      </form>

      <GoogleSignIn onCredential={onGoogle} text="signup_with" />

      <p className="mt-6 text-center text-sm text-slate-400">
        {t("register.have")}{" "}
        <Link to="/login" className="font-semibold text-cyan-300 transition hover:text-cyan-200">{t("nav.signin")}</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
