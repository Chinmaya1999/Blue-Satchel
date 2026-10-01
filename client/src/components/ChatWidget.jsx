import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Check, ShoppingBag, RotateCcw } from "lucide-react";
import api from "../api/axios.js";
import { useCart } from "../context/CartContext.jsx";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";
import { productImageFallback } from "./ProductCard.jsx";

const SESSION_KEY = "bs_chat_session";

// A random id the server uses to keep this visitor's conversation.
const getSessionId = () => {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = (crypto.randomUUID?.() || `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s${Math.random().toString(36).slice(2)}${Date.now().toString(36)}0000`;
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const Typing = () => (
  <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-white/[0.07] px-4 py-3" aria-label="Assistant is typing">
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200/80" style={{ animationDelay: `${i * 0.15}s` }} />
    ))}
  </div>
);

export const ProductMini = ({ product, onNavigate, fluid = false }) => {
  const { addItem } = useCart();
  const { shopEnabled } = useSiteSettings();
  return (
    <div className={`flex shrink-0 flex-col rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10 ${fluid ? "w-full" : "w-56"}`}>
      <Link to={`/shop/${product._id}`} onClick={onNavigate} className="block aspect-square overflow-hidden rounded-xl bg-white">
        <img src={product.imageUrl} alt={product.name} loading="lazy" onError={(e) => productImageFallback(e, product.category)} className="h-full w-full object-contain p-2" />
      </Link>
      <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-cyan-300">{product.stepLabel}</p>
      <Link to={`/shop/${product._id}`} onClick={onNavigate} className="line-clamp-2 text-[13px] font-semibold leading-snug text-white hover:text-cyan-200">
        {product.name}
      </Link>
      <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{product.reason}</p>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="font-display text-sm font-bold text-white">₹{product.price}</span>
        {shopEnabled ? (
          <button
            type="button"
            onClick={() => addItem({ ...product })}
            disabled={product.stock === 0}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-cyan-300 px-3 text-[11px] font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            <ShoppingBag size={12} /> {product.stock === 0 ? "Sold out" : "Add"}
          </button>
        ) : (
          <Link to={`/shop/${product._id}`} onClick={onNavigate} className="text-[11px] font-semibold text-cyan-300 hover:underline">
            View
          </Link>
        )}
      </div>
    </div>
  );
};

const ChatWidget = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, text } | { role: "products", products, total }
  const [quick, setQuick] = useState([]);
  const [inputMode, setInputMode] = useState("text"); // text | multi
  const [placeholder, setPlaceholder] = useState("Type your message…");
  const [selected, setSelected] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  const sessionId = useRef(null);
  const scroller = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [messages, busy, quick, open]);

  // Reveals the bot's replies one after another, like someone typing.
  const play = useCallback(async (data) => {
    setQuick([]);
    setSelected([]);
    for (let i = 0; i < data.messages.length; i++) {
      setBusy(true);
      await wait(i === 0 ? 350 : 650);
      setMessages((m) => [...m, { role: "bot", text: data.messages[i].text }]);
    }
    if (data.products?.length) {
      setBusy(true);
      await wait(500);
      setMessages((m) => [...m, { role: "products", products: data.products, total: data.total }]);
    }
    setBusy(false);
    setQuick(data.quickReplies || []);
    setInputMode(data.input || "text");
    setPlaceholder(data.placeholder || "Type your message…");
  }, []);

  const start = useCallback(async () => {
    sessionId.current = getSessionId();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/chat/start", { sessionId: sessionId.current });
      if (data.resumed?.length) setMessages(data.resumed.map((m) => ({ role: m.role, text: m.text })));
      await play(data);
    } catch {
      setBusy(false);
      started.current = false;
      setError("I couldn't connect just now. Please try again.");
    }
  }, [play]);

  useEffect(() => {
    if (open && !started.current) {
      started.current = true;
      start();
    }
    if (open) inputRef.current?.focus();
  }, [open, start]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = async ({ text: value, values, label }) => {
    if (busy) return;
    const shown = label || value || (values || []).join(", ");
    if (!shown?.trim()) return;
    setMessages((m) => [...m, { role: "user", text: shown }]);
    setText("");
    setBusy(true);
    setError("");
    setQuick([]);
    try {
      const { data } = await api.post("/chat/message", { sessionId: sessionId.current, text: value, values, label });
      await play(data);
    } catch (err) {
      setBusy(false);
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const submitText = (e) => {
    e.preventDefault();
    if (inputMode === "multi" && selected.length && !text.trim()) return send({ values: selected, label: selected.join(", ") });
    send({ text: text.trim(), values: inputMode === "multi" ? selected : undefined });
  };

  const toggle = (value) => setSelected((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));

  const restart = () => {
    setMessages([]);
    setQuick([]);
    send({ text: "cmd:restart", label: "Start over" });
  };

  // Not shown inside the admin console.
  if (pathname.startsWith("/admin")) return null;

  const multi = inputMode === "multi" && quick.length > 0;

  return (
    <div className="fs-page pointer-events-none fixed inset-0 z-[45] flex items-end justify-end p-4 sm:p-6">
      {open && (
        <section
          role="dialog"
          aria-label="Blue Satchel skin assistant"
          className="pointer-events-auto mb-16 flex h-[min(640px,calc(100dvh-7rem))] w-full max-w-[400px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#070b1a]/95 shadow-[0_20px_80px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-fade-up max-sm:fixed max-sm:inset-x-3 max-sm:bottom-20"
        >
          <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-cyan-400/15 to-violet-500/15 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300 text-slate-950">
                <MessageCircle size={19} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#070b1a]" />
              </span>
              <div>
                <p className="font-display text-sm font-bold leading-tight text-white">Skin Assistant</p>
                <p className="text-[11px] text-slate-400">Personalised picks · not medical advice</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={restart} disabled={busy} aria-label="Start over" title="Start over" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40">
                <RotateCcw size={15} />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "products" ? (
                <div key={i} className="-mx-4">
                  <div className="flex gap-3 overflow-x-auto px-4 pb-2">
                    {m.products.map((p) => (
                      <ProductMini key={p._id} product={p} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                </div>
              ) : (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      m.role === "user" ? "rounded-br-md bg-cyan-300 font-medium text-slate-950" : "rounded-bl-md bg-white/[0.07] text-slate-100"
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              )
            )}
            {busy && <Typing />}
            {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-400/25">{error}</p>}

            {!busy && quick.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quick.map((qr) => {
                  const active = selected.includes(qr.value);
                  return (
                    <button
                      key={qr.value}
                      type="button"
                      onClick={() => (multi ? toggle(qr.value) : send({ text: qr.value, label: qr.label }))}
                      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium ring-1 transition ${
                        active ? "bg-cyan-300 text-slate-950 ring-cyan-300" : "bg-white/[0.04] text-cyan-100 ring-cyan-300/30 hover:bg-cyan-300/15"
                      }`}
                    >
                      {active && <Check size={13} />} {qr.label}
                    </button>
                  );
                })}
                {multi && (
                  <button
                    type="button"
                    onClick={() => send({ values: selected, label: selected.length ? undefined : "None", text: selected.length ? undefined : "none" })}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-violet-400"
                  >
                    {selected.length ? `Done (${selected.length})` : "None / just maintenance"}
                  </button>
                )}
              </div>
            )}
          </div>

          <form onSubmit={submitText} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={placeholder}
              aria-label="Type your message"
              disabled={busy}
              className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/60 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || (!text.trim() && !(multi && selected.length))}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close skin assistant" : "Chat with our skin assistant"}
        className="pointer-events-auto fixed bottom-4 right-4 flex h-14 items-center gap-2 rounded-full bg-cyan-300 px-5 font-semibold text-slate-950 shadow-[0_8px_30px_rgba(94,231,255,0.45)] transition hover:scale-105 hover:bg-cyan-200 active:scale-95 sm:bottom-6 sm:right-6"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        <span className="hidden sm:inline">{open ? "Close" : "Ask our skin assistant"}</span>
      </button>
    </div>
  );
};

export default ChatWidget;
