import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Send, Loader2, CheckCircle2, RotateCcw, MessageSquare, ArrowLeft, ExternalLink } from "lucide-react";
import api from "../../api/axios.js";
import { usePoll } from "../../hooks/usePoll.js";

const ago = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const fmt = (d) => new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const Thread = ({ id, onChanged, onBack }) => {
  const [data, setData] = useState(null); // { user, status, messages }
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const total = useRef(0);
  const scroller = useRef(null);

  const merge = useCallback((res) => {
    total.current = res.total;
    setData((prev) => {
      const old = prev?.messages || [];
      const known = new Set(old.map((m) => m.id));
      return { ...(prev || {}), ...res, messages: [...old, ...res.messages.filter((m) => !known.has(m.id))] };
    });
  }, []);

  const poll = useCallback(
    () =>
      api
        .get(`/admin/support/${id}`, { params: { after: total.current } })
        .then(({ data: res }) => {
          const hadNew = res.messages.length > 0;
          merge(res);
          if (hadNew) onChanged();
        })
        .catch(() => setError("Couldn't load this conversation.")),
    [id, merge, onChanged]
  );
  usePoll(poll, 4000, true);

  useEffect(() => {
    const t = requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
    return () => cancelAnimationFrame(t);
  }, [data?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError("");
    try {
      const { data: res } = await api.post(`/admin/support/${id}/messages`, { text: value }, { params: { after: total.current } });
      setText("");
      merge({ ...res, user: data?.user });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your reply.");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status) => {
    await api.patch(`/admin/support/${id}`, { status });
    setData((d) => ({ ...d, status }));
    onChanged();
  };

  if (!data?.user) return <div className="flex flex-1 items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 animate-spin" size={16} /> Loading…</div>;
  const u = data.user;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={onBack} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Back to inbox"><ArrowLeft size={17} /></button>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{u.name}</p>
            <p className="truncate text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ""}{u.skinType && u.skinType !== "unknown" ? ` · ${u.skinType} skin` : ""}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/admin/customers/${u._id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"><ExternalLink size={13} /> Profile &amp; scans</Link>
          {data.status === "open" ? (
            <button onClick={() => setStatus("closed")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><CheckCircle2 size={14} /> Resolve</button>
          ) : (
            <button onClick={() => setStatus("open")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"><RotateCcw size={13} /> Reopen</button>
          )}
        </div>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
        {data.messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === "admin" ? "items-end" : "items-start"}`}>
            <p className={`max-w-[80%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm ${m.sender === "admin" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-100"}`}>{m.text}</p>
            <span className="mt-0.5 px-1 text-[10px] text-slate-400">{m.sender === "admin" ? "You · " : `${u.name.split(" ")[0]} · `}{fmt(m.createdAt)}</span>
          </div>
        ))}
      </div>

      {error && <p className="bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
          rows={2}
          maxLength={2000}
          placeholder="Write a reply… (Enter to send, Shift+Enter for a new line)"
          className="input min-h-[44px] flex-1 resize-none py-2 text-sm"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-primary h-11 rounded-full px-5 disabled:opacity-50">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Reply
        </button>
      </form>
    </div>
  );
};

const AdminSupport = () => {
  const [params, setParams] = useSearchParams();
  const selected = params.get("thread");
  const [threads, setThreads] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("open"); // open | unread | closed | all
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const query = { q: q || undefined };
    if (filter === "open" || filter === "closed") query.status = filter;
    if (filter === "unread") query.unread = 1;
    return api
      .get("/admin/support", { params: query })
      .then(({ data }) => setThreads(data.threads))
      .catch(() => setError("Couldn't load conversations."));
  }, [q, filter]);

  usePoll(load, 6000, true);

  const open = (id) => setParams(id ? { thread: id } : {}, { replace: true });

  return (
    <div className="card flex h-[calc(100vh-14rem)] min-h-[480px] overflow-hidden">
      {/* Inbox */}
      <aside className={`${selected ? "hidden lg:flex" : "flex"} w-full shrink-0 flex-col border-r border-slate-100 lg:w-80`}>
        <div className="space-y-2 border-b border-slate-100 p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="input py-2 pl-8 text-sm" />
          </div>
          <div className="flex gap-1">
            {[["open", "Open"], ["unread", "Unread"], ["closed", "Resolved"], ["all", "All"]].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${filter === id ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto">
          {error && <li className="p-4 text-sm text-rose-600">{error}</li>}
          {!threads && !error && <li className="p-6 text-center text-sm text-slate-400">Loading…</li>}
          {threads?.length === 0 && <li className="p-6 text-center text-sm text-slate-400">No conversations here.</li>}
          {threads?.map((t) => (
            <li key={t.id}>
              <button onClick={() => open(t.id)} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${selected === t.id ? "bg-brand-50" : ""}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">{t.user.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${t.unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{t.user.name}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{ago(t.lastMessageAt)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-xs ${t.unread ? "font-semibold text-slate-700" : "text-slate-400"}`}>{t.lastSender === "admin" ? "You: " : ""}{t.lastMessageText}</span>
                    {t.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{t.unread}</span>}
                  </span>
                  {t.status === "closed" && <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Resolved</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Conversation */}
      <section className={`${selected ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col`}>
        {selected ? (
          <Thread key={selected} id={selected} onChanged={load} onBack={() => open(null)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
            <MessageSquare size={34} />
            <p className="text-sm">Select a conversation to reply.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminSupport;
