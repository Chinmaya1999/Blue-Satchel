import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck, Loader2, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const LENGTH = 6;

const VerifyEmail = () => {
  const { user, verifyEmail, resendVerificationCode, logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const next = params.get("next") || "/scan";

  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const [error, setError] = useState(state?.emailSent === false ? "We couldn't send the email just now. Tap “Resend code”." : "");
  const [info, setInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(state?.emailSent === false ? 0 : 60);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Already verified (or an account from before verification existed).
  if (user && user.emailVerified !== false) return <Navigate to={next} replace />;

  const submit = async (code) => {
    if (code.length !== LENGTH || verifying) return;
    setVerifying(true);
    setError("");
    setInfo("");
    try {
      await verifyEmail(code);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't verify the code. Please try again.");
      setDigits(Array(LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const fill = (index, value) => {
    const clean = value.replace(/\D/g, "");
    if (!clean && value) return;
    const nextDigits = [...digits];
    // A paste (or autofill) of several digits spreads across the boxes.
    clean
      .slice(0, LENGTH - index)
      .split("")
      .forEach((d, i) => (nextDigits[index + i] = d));
    if (!clean) nextDigits[index] = "";
    setDigits(nextDigits);
    const focusAt = Math.min(index + Math.max(clean.length, 1), LENGTH - 1);
    if (clean) inputs.current[focusAt]?.focus();
    const code = nextDigits.join("");
    if (code.length === LENGTH) submit(code);
  };

  const onKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < LENGTH - 1) inputs.current[index + 1]?.focus();
    if (e.key === "Enter") submit(digits.join(""));
  };

  const resend = async () => {
    setResending(true);
    setError("");
    setInfo("");
    try {
      const data = await resendVerificationCode();
      setInfo(data.message);
      setCooldown(data.resendCooldownSeconds || 60);
      setDigits(Array(LENGTH).fill(""));
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send a new code. Please try again.");
      if (err.response?.data?.retryAfter) setCooldown(err.response.data.retryAfter);
    } finally {
      setResending(false);
    }
  };

  const startOver = () => {
    logout();
    navigate("/register", { replace: true });
  };

  return (
    <div className="fs-page fs-page-bg flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="fs-auth-card relative w-full max-w-md overflow-hidden rounded-[2rem] p-8 text-center">
        <div className="fs-auth-card-glow" />
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/30 shadow-[0_0_40px_-6px_rgba(94,231,255,0.6)]">
          <MailCheck size={24} />
        </span>
        <p className="fs-eyebrow text-[10px]">One last step</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-400">
          We sent a 6-digit code to <span className="font-semibold text-slate-200">{user?.email}</span>. Enter it below to
          activate your account.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(digits.join(""));
          }}
          className="mt-7"
        >
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
                disabled={verifying}
                className="h-14 w-11 rounded-xl bg-white/[0.04] text-center font-mono text-2xl font-bold text-white ring-1 ring-white/15 transition focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-60 sm:w-12"
              />
            ))}
          </div>

          {error && (
            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-rose-300">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </p>
          )}
          {info && (
            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 size={15} className="shrink-0" /> {info}
            </p>
          )}

          <button
            type="submit"
            disabled={verifying || digits.join("").length !== LENGTH}
            className="fs-btn-primary mt-6 w-full justify-center disabled:opacity-60"
          >
            {verifying ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify & continue"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-slate-400">
          <p>
            Didn't get it? Check spam, or{" "}
            <button
              onClick={resend}
              disabled={resending || cooldown > 0}
              className="inline-flex items-center gap-1 font-semibold text-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {resending && <RotateCw size={13} className="animate-spin" />}
              {cooldown > 0 ? `resend in ${cooldown}s` : "resend code"}
            </button>
          </p>
          <p>
            Wrong email?{" "}
            <button onClick={startOver} className="font-semibold text-cyan-300 hover:text-cyan-200">
              Sign up again
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
