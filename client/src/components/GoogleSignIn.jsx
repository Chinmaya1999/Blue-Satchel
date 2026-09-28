import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";

const GIS_SRC = "https://accounts.google.com/gsi/client";

let configPromise;
const loadClientId = () => (configPromise ??= api.get("/auth/config").then(({ data }) => data.googleClientId).catch(() => null));

const loadScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    const script = existing || Object.assign(document.createElement("script"), { src: GIS_SRC, async: true, defer: true });
    script.addEventListener("load", resolve);
    script.addEventListener("error", reject);
    if (!existing) document.head.appendChild(script);
  });

/**
 * "Continue with Google" button (Google Identity Services). Renders nothing
 * until the server reports a GOOGLE_CLIENT_ID, so the page works unchanged
 * before Google sign-in is configured. `onCredential(idToken)` is called
 * with the ID token for the server to verify.
 */
const GoogleSignIn = ({ onCredential, text = "continue_with", divider = "or" }) => {
  const el = useRef(null);
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clientId = await loadClientId();
      if (!clientId || cancelled) return;
      await loadScript().catch(() => null);
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => handler.current(res.credential),
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !el.current) return;
    window.google.accounts.id.renderButton(el.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text,
      width: Math.min(el.current.parentElement.clientWidth, 400),
    });
  }, [ready, text]);

  if (!ready) return <div ref={el} hidden />;
  return (
    <div className="mt-6">
      <div className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-600">
        <span className="h-px flex-1 bg-white/10" /> {divider} <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="flex justify-center" ref={el} />
    </div>
  );
};

export default GoogleSignIn;
