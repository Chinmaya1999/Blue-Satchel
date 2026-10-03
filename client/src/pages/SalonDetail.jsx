import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, Globe, Clock, Navigation, Package, Store, Loader2 } from "lucide-react";
import api from "../api/axios.js";
import Loader from "../components/Loader.jsx";
import OsmMap from "../components/OsmMap.jsx";
import { Stars, StarInput } from "../components/salon/StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { directionsUrl } from "../utils/geo.js";
import { formatPaise } from "../utils/money.js";

const SalonDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () =>
    api.get(`/salons/${slug}`).then(({ data }) => setData(data)).catch(() => setNotFound(true));
  useEffect(() => {
    load();
  }, [slug]);

  if (notFound) return <div className="fs-page fs-page-bg container-app py-24 text-center text-slate-400">Salon not found. <Link to="/salons" className="text-cyan-300 underline">Browse salons</Link></div>;
  if (!data) return <div className="fs-page fs-page-bg"><Loader full label="Loading salon…" /></div>;
  const { salon: s, products, reviews } = data;
  const address = [s.address?.line1, s.address?.line2, s.address?.city, s.address?.state, s.address?.postalCode].filter(Boolean).join(", ");

  const submitReview = async (e) => {
    e.preventDefault();
    if (!rating) return setMsg("Please choose a star rating.");
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/salons/${slug}/reviews`, { rating, comment });
      setComment("");
      setRating(0);
      setMsg("Thanks for your review!");
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || "Couldn't post your review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fs-page fs-page-bg">
      <div className="relative h-56 bg-slate-900 sm:h-72">
        {s.coverUrl ? <img src={s.coverUrl} alt="" className="h-full w-full object-cover opacity-80" /> : <div className="flex h-full items-center justify-center text-slate-700"><Store size={56} /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--fs-bg)] to-transparent" />
      </div>

      <div className="container-app -mt-16 pb-20">
        <div className="relative flex flex-wrap items-end gap-5">
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="" className="h-28 w-28 rounded-3xl border-4 border-[color:var(--fs-bg)] object-cover" />
          ) : (
            <span className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-[color:var(--fs-bg)] bg-cyan-300 font-display text-4xl font-bold text-slate-950">{s.name.charAt(0)}</span>
          )}
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">{s.name}</h1>
            {s.tagline && <p className="mt-1 text-sm text-slate-300">{s.tagline}</p>}
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <Stars value={s.ratingAvg} />
              {s.ratingCount ? <span><b className="text-white">{s.ratingAvg}</b> · {s.ratingCount} review{s.ratingCount > 1 ? "s" : ""}</span> : <span>No reviews yet</span>}
            </div>
          </div>
          {Number.isFinite(s.location?.lat) && (
            <a href={directionsUrl(s.location.lat, s.location.lng)} target="_blank" rel="noreferrer" className="fs-nav-cta"><Navigation size={15} /> Get directions</a>
          )}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {s.description && (
              <section>
                <h2 className="font-display text-lg font-bold text-white">About</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{s.description}</p>
              </section>
            )}
            {s.services?.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white">Services</h2>
                <div className="mt-3 flex flex-wrap gap-2">{s.services.map((x) => <span key={x} className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/10">{x}</span>)}</div>
              </section>
            )}
            {Object.values(s.scanPrices || {}).some((p) => p > 0) && (
              <section>
                <h2 className="font-display text-lg font-bold text-white">AI skin scan</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[["quick", "Quick Scan"], ["focus", "Focus Scan"], ["detailed", "Detailed Scan"]].filter(([k]) => s.scanPrices[k] > 0).map(([k, label]) => (
                    <div key={k} className="card rounded-2xl p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-display text-xl font-bold text-white">{formatPaise(s.scanPrices[k])}</p></div>
                  ))}
                </div>
              </section>
            )}
            {products.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white">Salon products</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <div key={p.id} className="card overflow-hidden rounded-2xl">
                      <div className="flex aspect-[4/3] items-center justify-center bg-slate-900">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <Package size={26} className="text-slate-600" />}</div>
                      <div className="p-3"><p className="truncate text-sm font-semibold text-white">{p.name}</p><p className="text-xs text-slate-400">{p.brand}</p><p className="mt-1 font-display text-sm font-bold text-cyan-300">{formatPaise(p.pricePaise)}</p></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-lg font-bold text-white">Reviews</h2>
              {user ? (
                <form onSubmit={submitReview} className="card mt-3 space-y-3 rounded-2xl p-4">
                  <p className="text-sm text-slate-300">Rate your experience</p>
                  <StarInput value={rating} onChange={setRating} />
                  <textarea className="input min-h-[72px]" maxLength={1000} placeholder="Write a review (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex items-center gap-3">
                    <button disabled={busy} className="btn-primary rounded-full">{busy && <Loader2 size={15} className="animate-spin" />} Post review</button>
                    {msg && <span className="text-xs text-slate-400">{msg}</span>}
                  </div>
                </form>
              ) : (
                <p className="mt-2 text-sm text-slate-400"><Link to={`/login?redirect=/salons/${slug}`} className="text-cyan-300 underline">Sign in</Link> to rate this salon.</p>
              )}
              <ul className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="card rounded-2xl p-4">
                    <div className="flex items-center gap-2"><Stars value={r.rating} size={13} /><span className="text-sm font-semibold text-white">{r.name}</span><span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                    {r.comment && <p className="mt-1.5 text-sm text-slate-300">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="card space-y-3 rounded-2xl p-5 text-sm text-slate-300">
              <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-cyan-300" /> {address}</p>
              {s.phone && <a href={`tel:${s.phone}`} className="flex gap-2 hover:text-white"><Phone size={16} className="mt-0.5 shrink-0 text-cyan-300" /> {s.phone}</a>}
              {s.website && <a href={/^https?:\/\//.test(s.website) ? s.website : `https://${s.website}`} target="_blank" rel="noreferrer" className="flex gap-2 hover:text-white"><Globe size={16} className="mt-0.5 shrink-0 text-cyan-300" /> <span className="truncate">{s.website}</span></a>}
            </div>
            {Number.isFinite(s.location?.lat) && (
              <OsmMap className="h-56 overflow-hidden rounded-2xl" markers={[{ lat: s.location.lat, lng: s.location.lng, popup: s.name, primary: true }]} />
            )}
            {s.hours?.length > 0 && (
              <div className="card rounded-2xl p-5 text-sm">
                <p className="mb-2 flex items-center gap-2 font-semibold text-white"><Clock size={15} className="text-cyan-300" /> Opening hours</p>
                <ul className="space-y-1 text-slate-300">
                  {s.hours.map((h) => (<li key={h.day} className="flex justify-between"><span>{h.day}</span><span className={h.closed ? "text-slate-500" : ""}>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span></li>))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SalonDetail;
