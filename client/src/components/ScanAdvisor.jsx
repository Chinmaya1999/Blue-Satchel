import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, Check, RotateCcw, ShoppingBag, Sparkles } from "lucide-react";
import api from "../api/axios.js";
import { useCart } from "../context/CartContext.jsx";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";
import { ProductMini, Typing } from "./ChatWidget.jsx";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The "Recommended for you" section of a scan report, as a conversation: it
 * reads the scan, asks what the customer wants and about their routine,
 * explains a plan, and only then — if they ask — shows products or nearby
 * dermatologists.
 */
const ScanAdvisor = ({ scanId, onShowDermatologists }) => {
  const { addItem } = useCart();
  const { shopEnabled } = useSiteSettings();
  const [messages, setMessages] = useState([]); // { role: bot|user } | { role: "products", products, total }
  const [state, setState] = useState(null);
  const [quick, setQuick] = useState([]);
  const [inputMode, setInputMode] = useState("text");
  const [placeholder, setPlaceholder] = useState("Type your message…");
  const [selected, setSelected] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [bagged, setBagged] = useState(false);
  const scroller = useRef(null);
  const run = useRef(0); // ignores replies that belong to an older scan/session
  // Held in a ref so a new callback from the parent never restarts the chat.
  const showDermRef = useRef(onShowDermatologists);
  showDermRef.current = onShowDermatologists;

  useEffect(() => {
    const id = requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [messages, busy, quick]);

  const play = useCallback(
    async (data, token) => {
      setQuick([]);
      setSelected([]);
      setState(data.state);
      for (let i = 0; i < data.messages.length; i++) {
        setBusy(true);
        await wait(i === 0 ? 400 : 700);
        if (token !== run.current) return;
        setMessages((m) => [...m, { role: "bot", text: data.messages[i].text }]);
      }
      if (data.products?.length) {
        await wait(400);
        if (token !== run.current) return;
        setMessages((m) => [...m, { role: "products", products: data.products, total: data.total }]);
      }
      if (data.action === "dermatologists") showDermRef.current?.();
      setBusy(false);
      setQuick(data.quickReplies || []);
      setInputMode(data.input || "text");
      setPlaceholder(data.placeholder || "Type your message…");
    },
    []
  );

  const call = useCallback(
    async (body, token) => {
      try {
        const { data } = await api.post(`/scans/${scanId}/advisor`, body);
        await play(data, token);
      } catch (err) {
        if (token !== run.current) return;
        setBusy(false);
        setError(err.response?.data?.message || "I couldn't reach the assistant. Please try again.");
      }
    },
    [scanId, play]
  );

  const begin = useCallback(() => {
    const token = ++run.current;
    setMessages([]);
    setState(null);
    setBusy(true);
    setError("");
    call({ init: true }, token);
  }, [call]);

  useEffect(() => {
    begin();
    return () => {
      run.current++;
    };
  }, [begin]);

  const send = ({ text: value, values, label }) => {
    if (busy) return;
    const shown = label || value || (values || []).join(", ");
    if (!shown?.trim()) return;
    if (value === "cmd:redo") setBagged(false);
    setMessages((m) => [...m, { role: "user", text: shown }]);
    setText("");
    setBusy(true);
    setError("");
    setQuick([]);
    call({ state, text: value, values }, run.current);
  };

  const multi = inputMode === "multi" && quick.length > 0;
  const toggle = (v) => setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  const labelOf = (v) => quick.find((q) => q.value === v)?.label.replace(/ · .*/, "") || v;

  const submit = (e) => {
    e.preventDefault();
    if (multi && selected.length && !text.trim()) return send({ values: selected, label: selected.map(labelOf).join(", ") });
    send({ text: text.trim(), values: multi ? selected : undefined });
  };

  const addAll = (products) => {
    products.forEach((p) => addItem({ ...p }));
    setBagged(true);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-cyan-400/10 to-violet-500/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300 text-slate-950">
            <Sparkles size={18} />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-white">Your skin advisor</p>
            <p className="text-[11px] text-slate-400">Built from your scan · not medical advice</p>
          </div>
        </div>
        <button type="button" onClick={begin} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-40">
          <RotateCcw size={13} /> Start over
        </button>
      </div>

      <div ref={scroller} className="max-h-[560px] min-h-[320px] space-y-3 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {messages.map((m, i) =>
          m.role === "products" ? (
            <div key={i} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {m.products.map((p) => (
                  <ProductMini key={p._id} product={p} fluid />
                ))}
              </div>
              {shopEnabled && (
                <button type="button" onClick={() => addAll(m.products)} className="btn-primary rounded-full">
                  <ShoppingBag size={15} /> {bagged ? "Added to bag ✓" : `Add all to bag · ₹${m.total}`}
                </button>
              )}
              <p className="text-xs text-slate-500">
                Prefer to browse? <Link to="/shop" className="text-cyan-300 hover:underline">See all products</Link>
              </p>
            </div>
          ) : (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%] ${
                  m.role === "user" ? "rounded-br-md bg-cyan-300 font-medium text-slate-950" : "rounded-bl-md bg-white/[0.07] text-slate-100"
                }`}
              >
                {m.text}
              </p>
            </div>
          )
        )}
        {busy && <Typing />}
        {error && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-400/25">
            {error}{" "}
            <button type="button" onClick={begin} className="font-semibold underline">Try again</button>
          </p>
        )}

        {!busy && quick.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {quick.map((qr) => {
              const active = selected.includes(qr.value);
              return (
                <button
                  key={qr.value}
                  type="button"
                  onClick={() => (multi ? toggle(qr.value) : send({ text: qr.value, label: qr.label }))}
                  className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                    active ? "bg-cyan-300 text-slate-950 ring-cyan-300" : "bg-white/[0.04] text-cyan-100 ring-cyan-300/30 hover:bg-cyan-300/15"
                  }`}
                >
                  {active && <Check size={14} />} {qr.label}
                </button>
              );
            })}
            {multi && (
              <button
                type="button"
                onClick={() => (selected.length ? send({ values: selected, label: selected.map(labelOf).join(", ") }) : send({ text: "none", label: "None of these" }))}
                className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
              >
                {selected.length ? `Done (${selected.length})` : "None of these"}
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3 sm:p-4">
        <MessageCircle size={18} className="ml-1 hidden shrink-0 text-slate-500 sm:block" />
        <input
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
    </div>
  );
};

export default ScanAdvisor;
