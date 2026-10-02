import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthShell, { Field } from "../components/landing/AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLocale } from "../context/LocaleContext.jsx";
import GoogleSignIn from "../components/GoogleSignIn.jsx";

const STAGES = [
  {
    preset: "hero",
    label: "Welcome back",
    detail: "Your scans and routine are waiting",
    callouts: [{ at: "forehead", label: "Face ID", value: "Mapped", side: "right", len: 70 }],
  },
  { preset: "landmarks", label: "Landmarks locked", detail: "68 key points on your features" },
  { preset: "heat", label: "Concerns mapped", detail: "Oil · redness · dark circles · spots" },
  { preset: "result", label: "Track your progress", detail: "Compare every scan over time" },
];

const Login = () => {
  const { t } = useLocale();
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const redirect = params.get("redirect") || "/";
      // Signed up but never entered the email code — finish that first.
      navigate(user.emailVerified === false ? `/verify-email?next=${encodeURIComponent(redirect === "/" ? "/scan" : redirect)}` : redirect);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (credential) => {
    setError("");
    setLoading(true);
    try {
      await googleLogin(credential);
      navigate(params.get("redirect") || "/");
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      stages={STAGES}
      eyebrow={t("login.eyebrow")}
      title={t("login.title")}
      subtitle={t("login.sub")}
      error={error}
      
    >
      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field
          icon={Mail}
          label={t("auth.email")}
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Field
          icon={Lock}
          label={t("auth.password")}
          type={show ? "text" : "password"}
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          right={
            <button type="button" onClick={() => setShow((v) => !v)} className="fs-field-action" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            {t("login.forgot")}
          </Link>
        </div>

        <button type="submit" disabled={loading} className="fs-btn-primary group mt-2 w-full justify-center disabled:opacity-60">
          {loading ? (
            <><Loader2 size={17} className="animate-spin" /> {t("login.signingIn")}</>
          ) : (
            <>{t("login.eyebrow")} <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>
          )}
        </button>
      </form>

      <GoogleSignIn onCredential={onGoogle} />

      <div className="my-7 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-600">
        <span className="h-px flex-1 bg-white/10" /> {t("login.newHere")} <span className="h-px flex-1 bg-white/10" />
      </div>

      <Link to="/register" className="fs-btn-ghost w-full justify-center">
        {t("login.create")}
      </Link>
    </AuthShell>
  );
};

export default Login;
