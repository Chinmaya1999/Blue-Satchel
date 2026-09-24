import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthShell, { Field } from "../components/landing/AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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
  const { login } = useAuth();
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
      await login(form.email, form.password);
      navigate(params.get("redirect") || "/");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      stages={STAGES}
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Sign in to see your skin scans, reports and orders."
      error={error}
      footer={
        <p className="mt-4 text-center font-mono text-[11px] text-slate-500">
          Admin demo: admin@bluesatchel.com / Admin@123
        </p>
      }
    >
      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field
          icon={Mail}
          label="Email address"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Field
          icon={Lock}
          label="Password"
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

        <button type="submit" disabled={loading} className="fs-btn-primary group mt-2 w-full justify-center disabled:opacity-60">
          {loading ? (
            <><Loader2 size={17} className="animate-spin" /> Signing in…</>
          ) : (
            <>Sign in <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>
          )}
        </button>
      </form>

      <div className="my-7 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-600">
        <span className="h-px flex-1 bg-white/10" /> New here <span className="h-px flex-1 bg-white/10" />
      </div>

      <Link to="/register" className="fs-btn-ghost w-full justify-center">
        Create a free account
      </Link>
    </AuthShell>
  );
};

export default Login;
