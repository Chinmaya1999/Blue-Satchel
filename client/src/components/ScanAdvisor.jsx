import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Check, RotateCcw, ShoppingBag, Plus } from "lucide-react";
import api from "../api/axios.js";
import { useCart } from "../context/CartContext.jsx";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";
import { Typing } from "./ChatWidget.jsx";
import { productImageFallback } from "./ProductCard.jsx";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const THEME = {
  cyan: { badge: "bg-cyan-300 text-slate-950", head: "from-cyan-400/10 to-violet-500/10", user: "bg-cyan-300 text-slate-950", chip: "ring-cyan-300/30 text-cyan-100 hover:bg-cyan-300/15", on: "bg-cyan-300 text-slate-950 ring-cyan-300", cta: "bg-cyan-300 text-slate-950 hover:bg-cyan-200", link: "text-cyan-300" },
  rose: { badge: "bg-rose-300 text-slate-950", head: "from-rose-400/10 to-amber-300/10", user: "bg-rose-300 text-slate-950", chip: "ring-rose-300/30 text-rose-100 hover:bg-rose-300/15", on: "bg-rose-300 text-slate-950 ring-rose-300", cta: "bg-rose-300 text-slate-950 hover:bg-rose-200", link: "text-rose-300" },
};

// A compact product line, small enough for a chat bubble.
const ProductRow = ({ product, theme, shopEnabled }) => {
  const { addItem } = useCart();
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-2 ring-1 ring-white/10">
      <Link to={`/shop/${product._id}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
        <img src={product.imageUrl} alt="" loading="lazy" onError={(e) => productImageFallback(e, product.category)} className="h-full w-full object-contain p-1" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className={`font-mono text-[9px] font-semibold uppercase tracking-wider ${theme.link}`}>{product.stepLabel}</p>
        <Link to={`/shop/${product._id}`} className="block truncate text-[13px] font-semibold text-white hover:underline">{product.name}</Link>
        <p className="truncate text-[11px] text-slate-400">{product.brand} · {product.reason}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-display text-sm font-bold text-white">₹{product.price}</span>
        {shopEnabled && (
          <button type="button" onClick={() => addItem({ ...product })} aria-label={`Add ${product.name} to bag`} className={`inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-[10px] font-bold ${theme.cta}`}>
            <Plus size={11} /> Add
          </button>
        )}
      </div>
    </li>
  );
};

/**
 * A guided chat on a scan report. `endpoint` picks the conversation:
 * "advisor" (general skin plan) or "kbeauty" (Korean skin care). Products and
 * the dermatologist list only appear when the customer asks for them.
 */
const ScanAdvisor = ({ scanId, endpoint = "advisor", title, subtitle, icon: Icon, productsLabel = "Show recommended products", accent = "cyan", onShowDermatologists }) => {
  const theme = THEME[accent];
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
  const run = useRef(0); // ignores replies that belong to an older conversation
  // Held in a ref so a new callback from the parent never restarts the chat.
  const showDermRef = useRef(onShowDermatologists);
  showDermRef.current = onShowDermatologists;

  useEffect(() => {
    const id = requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [messages, busy, quick]);

  const play = useCallback(async (data, token) => {
    setQuick([]);
    setSelected([]);
    setState(data.state);
    for (let i = 0; i < data.messages.length; i++) {
      setBusy(true);
      await wait(i === 0 ? 350 : 600);
      if (token !== run.current) return;
      setMessages((m) => [...m, { role: "bot", text: data.messages[i].text }]);
    }
    if (data.products?.length) {
      await wait(300);
      if (token !== run.current) return;
      setMessages((m) => [...m, { role: "products", products: data.products, total: data.total }]);
    }
    if (data.action === "dermatologists") showDermRef.current?.();
    setBusy(false);
    setQuick(data.quickReplies || []);
    setInputMode(data.input || "text");
    setPlaceholder(data.placeholder || "Type your message…");
  }, []);

  const call = useCallback(
    async (body, token) => {
      try {
        const { data } = await api.post(`/scans/${scanId}/${endpoint}`, body);
        await play(data, token);
      } catch (err) {
        if (token !== run.current) return;
        setBusy(false);
        setError(err.response?.data?.message || "I couldn't reach the assistant. Please try again.");
      }
    },
    [scanId, endpoint, play]
  );

  const begin = useCallback(() => {
    const token = ++run.current;
    setMessages([]);
    setState(null);
    setBusy(true);
    setError("");
    setBagged(false);
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
    setMessages((m) => [...m, { role: "user", text: shown }]);
    setText("");
    setBusy(true);
    setError("");
    setQuick([]);
    call({ state, text: value, values }, run.current);
  };

  const multi = inputMode === "multi" && quick.length > 0;
  const toggle = (v) => setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  const labelOf = (v) => quick.find((qr) => qr.value === v)?.label.replace(/ · .*/, "") || v;

  const submit = (e) => {
    e.preventDefault();
    if (multi && selected.length && !text.trim()) return send({ values: selected, label: selected.map(labelOf).join(", ") });
    send({ text: text.trim(), values: multi ? selected : undefined });
  };

  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className={`flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r ${theme.head} px-4 py-3`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${theme.badge}`}>
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-white">{title}</p>
            <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        <button type="button" onClick={begin} disabled={busy} aria-label="Start over" title="Start over" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-40">
          <RotateCcw size={14} />
        </button>
      </div>

      <div ref={scroller} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((m, i) =>
          m.role === "products" ? (
            <div key={i} className="space-y-2">
              <ul className="space-y-2">
                {m.products.map((p) => (
                  <ProductRow key={p._id} product={p} theme={theme} shopEnabled={shopEnabled} />
                ))}
              </ul>
              {shopEnabled && (
                <button type="button" onClick={() => { m.products.forEach((p) => addItem({ ...p })); setBagged(true); }} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold ${theme.cta}`}>
                  <ShoppingBag size={13} /> {bagged ? "Added to bag ✓" : `Add all to bag · ₹${m.total}`}
                </button>
              )}
            </div>
          ) : (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${m.role === "user" ? `rounded-br-md font-medium ${theme.user}` : "rounded-bl-md bg-white/[0.07] text-slate-100"}`}>
                {m.text}
              </p>
            </div>
          )
        )}
        {busy && <Typing />}
        {error && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-400/25">
            {error} <button type="button" onClick={begin} className="font-semibold underline">Try again</button>
          </p>
        )}

        {!busy && quick.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quick.map((qr) => {
              const active = selected.includes(qr.value);
              return (
                <button
                  key={qr.value}
                  type="button"
                  onClick={() => (multi ? toggle(qr.value) : send({ text: qr.value, label: qr.label }))}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${active ? theme.on : `bg-white/[0.04] ${theme.chip}`}`}
                >
                  {active && <Check size={12} />} {qr.label}
                </button>
              );
            })}
            {multi && (
              <button
                type="button"
                onClick={() => (selected.length ? send({ values: selected, label: selected.map(labelOf).join(", ") }) : send({ text: "you choose", label: "You choose for me" }))}
                className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-400"
              >
                {selected.length ? `Done (${selected.length})` : "You choose for me"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-black/20 p-3">
        <button
          type="button"
          onClick={() => send({ text: "cmd:products", label: productsLabel })}
          disabled={busy}
          className={`mb-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${theme.cta}`}
        >
          <ShoppingBag size={14} /> {productsLabel}
        </button>
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={placeholder}
            aria-label="Type your message"
            disabled={busy}
            className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 text-[13px] text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
          />
          <button type="submit" disabled={busy || (!text.trim() && !(multi && selected.length))} aria-label="Send" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${theme.cta}`}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScanAdvisor;
