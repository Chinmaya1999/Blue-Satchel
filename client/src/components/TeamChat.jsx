import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Loader2, LifeBuoy } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { usePoll } from "../hooks/usePoll.js";

const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// Live chat with the Blue Satchel team inside the chat widget. Customers can
// ask about skin care, products, a scan result or anything on the site; an
// admin answers from the console. New replies are fetched every few seconds.
const TeamChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const total = useRef(0);
  const scroller = useRef(null);

  const merge = useCallback((data) => {
    if (!data.messages?.length) {
      total.current = data.total ?? total.current;
      return;
    }
    total.current = data.total;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      return [...prev, ...data.messages.filter((m) => !known.has(m.id))];
    });
  }, []);

  const poll = useCallback(
    () =>
      api
        .get("/support/me", { params: { after: total.current } })
        .then(({ data }) => {
          merge(data);
          setLoaded(true);
        })
        .catch(() => setLoaded(true)),
    [merge]
  );
  usePoll(poll, 4000, Boolean(user));

  useEffect(() => {
    const id = requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [messages]);

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-300 ring-1 ring-cyan-300/25"><LifeBuoy size={22} /></span>
        <p className="text-sm text-slate-300">Sign in to message our team directly about your skin, a product or a scan result.</p>
        <Link to="/login" className="btn-primary h-10 rounded-full px-5 text-sm">Sign in</Link>
      </div>
    );
  }

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError("");
    try {
      const { data } = await api.post("/support/me/messages", { text: value }, { params: { after: total.current } });
      setText("");
      merge(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <p className="rounded-2xl bg-white/[0.05] px-3.5 py-3 text-[12.5px] leading-relaxed text-slate-300 ring-1 ring-white/10">
          Ask our team anything — skin care, product advice, a problem with your scan or your account. We reply here, and you'll see a
          notification when we do. For urgent or serious skin concerns, please see a dermatologist.
        </p>
        {!loaded && <p className="py-6 text-center text-xs text-slate-500"><Loader2 size={14} className="mr-1 inline animate-spin" /> Loading…</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                m.sender === "user" ? "rounded-br-md bg-cyan-300 font-medium text-slate-950" : "rounded-bl-md bg-white/[0.07] text-slate-100"
              }`}
            >
              {m.text}
            </p>
            <span className="mt-0.5 px-1 text-[10px] text-slate-500">{m.sender === "admin" ? "Blue Satchel team · " : ""}{fmtTime(m.createdAt)}</span>
          </div>
        ))}
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Message our team…"
          aria-label="Message our team"
          className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
        >
          {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </form>
    </>
  );
};

export default TeamChat;
