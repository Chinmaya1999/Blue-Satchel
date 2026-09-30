import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import AuthShell, { Field } from "../components/landing/AuthShell.jsx";
import api from "../api/axios.js";

const LENGTH = 6;

const STAGES = [
  { preset: "hero", label: "Account recovery", detail: "Get back into your account in a minute" },
  { preset: "landmarks", label: "Verify it's you", detail: "A 6-digit code goes to your email" },
  { preset: "result", label: "Choose a new password", detail: "Then sign in as usual" },
];

const COPY = {
  email: ["Forgot password?", "Enter your email and we'll send you a 6-digit code."],
  code: ["Check your email", "Enter the 6-digit code we sent you."],
  password: ["Set a new password", "Choose a password you haven't used before."],
  done: ["Password updated", "You can now sign in with your new password."],
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email → code → password → done
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") inputs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => navigate("/login", { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [step, navigate]);

  const call = async (fn) => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      if (err.response?.data?.retryAfter) setCooldown(err.response.data.retryAfter);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = (e) => {
    e?.preventDefault();
    return call(async () => {
      const { data } = await api.post("/auth/forgot-password", { email });
      setCooldown(data.resendCooldownSeconds || 60);
      setDigits(Array(LENGTH).fill(""));
      if (step === "code") setInfo("A new code has been sent.");
      setStep("code");
    });
  };

  const verify = (code) => {
    if (code.length !== LENGTH || loading) return;
    return call(async () => {
      try {
        const { data } = await api.post("/auth/verify-reset-code", { email, code });
        setResetToken(data.resetToken);
        setStep("password");
      } catch (err) {
        setDigits(Array(LENGTH).fill(""));
        inputs.current[0]?.focus();
        throw err;
      }
    });
  };

  const fill = (index, value) => {
    const clean = value.replace(/\D/g, "");
    if (!clean && value) return;
    const next = [...digits];
    clean.slice(0, LENGTH - index).split("").forEach((d, i) => (next[index + i] = d));
    if (!clean) next[index] = "";
    setDigits(next);
    if (clean) inputs.current[Math.min(index + clean.length, LENGTH - 1)]?.focus();
    if (next.join("").length === LENGTH) verify(next.join(""));
  };

  const onKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === "Enter") verify(digits.join(""));
  };

  const mismatch = confirm.length > 0 && password !== confirm;

  const savePassword = (e) => {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    return call(async () => {
      await api.post("/auth/reset-password", { email, resetToken, password, confirmPassword: confirm });
      setStep("done");
    });
  };

  const [title, subtitle] = COPY[step];

  return (
    <AuthShell
      stages={STAGES}
      eyebrow="Reset password"
      title={title}
      subtitle={step === "code" ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.` : subtitle}
      error={error}
      footer={
        step !== "done" && (
          <p className="mt-4 text-center text-sm text-slate-400">
            <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </p>
        )
      }
    >
      {step === "email" && (
        <form onSubmit={sendCode} className="mt-7 space-y-4">
          <Field icon={Mail} label="Email address" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={loading} className="fs-btn-primary group mt-2 w-full justify-center disabled:opacity-60">
            {loading ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : <>Send code <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>}
          </button>
        </form>
      )}

      {step === "code" && (
        <div className="mt-7">
          <div className="flex justify-center gap-2 sm:gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                value={d}
                onChange={(e) => fill(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={LENGTH}
                aria-label={`Digit ${i + 1}`}
                disabled={loading}
                className="h-14 w-11 rounded-xl bg-white/[0.04] text-center font-mono text-2xl font-bold text-white ring-1 ring-white/15 transition focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-60 sm:w-12"
              />
            ))}
          </div>
          {info && <p className="mt-4 text-center text-sm text-emerald-300">{info}</p>}
          <button
            type="button"
            onClick={() => verify(digits.join(""))}
            disabled={loading || digits.join("").length !== LENGTH}
            className="fs-btn-primary mt-6 w-full justify-center disabled:opacity-60"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify code"}
          </button>
          <p className="mt-5 text-center text-sm text-slate-400">
            Didn't get it? Check spam, or{" "}
            <button onClick={sendCode} disabled={loading || cooldown > 0} className="font-semibold text-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-500">
              {cooldown > 0 ? `resend in ${cooldown}s` : "resend code"}
            </button>
          </p>
          <p className="mt-2 text-center text-sm text-slate-400">
            Wrong email?{" "}
            <button onClick={() => { setStep("email"); setError(""); setInfo(""); }} className="font-semibold text-cyan-300 hover:text-cyan-200">
              Change it
            </button>
          </p>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={savePassword} className="mt-7 space-y-4">
          <Field
            icon={Lock}
            label="New password"
            type={show ? "text" : "password"}
            required
            minLength={6}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            right={
              <button type="button" onClick={() => setShow((v) => !v)} className="fs-field-action" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <Field
            icon={Lock}
            label="Confirm new password"
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && <p className="text-sm text-rose-300">Passwords don't match.</p>}
          {confirm && !mismatch && <p className="flex items-center gap-1.5 text-sm text-emerald-300"><CheckCircle2 size={14} /> Passwords match</p>}
          <button type="submit" disabled={loading || mismatch || !password || !confirm} className="fs-btn-primary mt-2 w-full justify-center disabled:opacity-60">
            {loading ? <><Loader2 size={17} className="animate-spin" /> Saving…</> : "Reset password"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-7 text-center">
          <CheckCircle2 size={44} className="mx-auto text-emerald-300" />
          <Link to="/login" className="fs-btn-primary mt-6 w-full justify-center">Sign in</Link>
        </div>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
