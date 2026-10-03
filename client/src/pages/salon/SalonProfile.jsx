import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { MapPin, Loader2, Save, CheckCircle2 } from "lucide-react";
import api from "../../api/axios.js";
import ImageUpload from "../../components/salon/ImageUpload.jsx";
import { getBrowserLocation } from "../../utils/geo.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultHours = () => DAYS.map((day) => ({ day, open: "10:00", close: "20:00", closed: day === "Sun" }));

const SalonProfile = () => {
  const { salon, reload } = useOutletContext();
  const navigate = useNavigate();
  const firstSetup = !salon.profileComplete;
  const [form, setForm] = useState({
    name: salon.name || "",
    tagline: salon.tagline || "",
    description: salon.description || "",
    logoUrl: salon.logoUrl || "",
    coverUrl: salon.coverUrl || "",
    phone: salon.phone || "",
    email: salon.email || "",
    website: salon.website || "",
    gstin: salon.gstin || "",
    address: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "India", ...(salon.address || {}) },
    lat: salon.location?.lat ?? "",
    lng: salon.location?.lng ?? "",
    services: (salon.services || []).join(", "),
    hours: salon.hours?.length ? salon.hours : defaultHours(),
  });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setAddr = (key) => (e) => setForm({ ...form, address: { ...form.address, [key]: e.target.value } });
  const setHour = (i, patch) => setForm({ ...form, hours: form.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)) });

  const useMyLocation = async () => {
    setLocating(true);
    const loc = await getBrowserLocation();
    setLocating(false);
    if (loc) setForm((f) => ({ ...f, lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6) }));
    else setError("Couldn't get your location. Allow location access in the browser, or type the coordinates.");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      await api.put("/salon/me", {
        ...form,
        location: { lat: form.lat, lng: form.lng },
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
      });
      await reload();
      setSaved(true);
      if (firstSetup) navigate("/salon");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">{firstSetup ? "Set up your salon" : "Salon profile"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {firstSetup
            ? "Add your salon's details so customers can find you. Name, phone, address and map location are required."
            : "This is what customers see on your Blue Satchel page."}
        </p>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-800">Branding</h2>
        <div className="flex flex-wrap gap-6">
          <ImageUpload value={form.logoUrl} onChange={(logoUrl) => setForm({ ...form, logoUrl })} label="Upload logo" shape="round" />
          <ImageUpload value={form.coverUrl} onChange={(coverUrl) => setForm({ ...form, coverUrl })} label="Upload cover photo" className="h-24 w-40" />
        </div>
        <div>
          <label className="label">Salon name *</label>
          <input className="input mt-1" required maxLength={80} value={form.name} onChange={set("name")} />
        </div>
        <div>
          <label className="label">Tagline</label>
          <input className="input mt-1" maxLength={140} placeholder="e.g. Skin & hair studio in Bandra" value={form.tagline} onChange={set("tagline")} />
        </div>
        <div>
          <label className="label">About the salon</label>
          <textarea className="input mt-1 min-h-[96px]" maxLength={2000} value={form.description} onChange={set("description")} />
        </div>
        <div>
          <label className="label">Services (comma separated)</label>
          <input className="input mt-1" placeholder="Facial, Hydrafacial, Hair spa, Bridal makeup" value={form.services} onChange={set("services")} />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-800">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Phone *</label>
            <input className="input mt-1" required type="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label className="label">Public email</label>
            <input className="input mt-1" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input mt-1" placeholder="https://" value={form.website} onChange={set("website")} />
          </div>
          <div>
            <label className="label">GSTIN (shown on bills)</label>
            <input className="input mt-1" maxLength={20} value={form.gstin} onChange={set("gstin")} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-800">Location</h2>
        <div>
          <label className="label">Address line 1 *</label>
          <input className="input mt-1" required value={form.address.line1} onChange={setAddr("line1")} />
        </div>
        <div>
          <label className="label">Address line 2</label>
          <input className="input mt-1" value={form.address.line2} onChange={setAddr("line2")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">City *</label>
            <input className="input mt-1" required value={form.address.city} onChange={setAddr("city")} />
          </div>
          <div>
            <label className="label">State</label>
            <input className="input mt-1" value={form.address.state} onChange={setAddr("state")} />
          </div>
          <div>
            <label className="label">PIN / postal code</label>
            <input className="input mt-1" value={form.address.postalCode} onChange={setAddr("postalCode")} />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input mt-1" value={form.address.country} onChange={setAddr("country")} />
          </div>
        </div>
        <div>
          <label className="label">Map location *</label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input className="input w-36" required placeholder="Latitude" inputMode="decimal" value={form.lat} onChange={set("lat")} />
            <input className="input w-36" required placeholder="Longitude" inputMode="decimal" value={form.lng} onChange={set("lng")} />
            <button type="button" onClick={useMyLocation} disabled={locating} className="btn-secondary rounded-full">
              {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />} Use my current location
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">Stand at the salon and tap the button, so customers nearby can find you.</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Opening hours</h2>
        <div className="mt-3 space-y-2">
          {form.hours.map((h, i) => (
            <div key={h.day} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-10 font-medium text-slate-700">{h.day}</span>
              <input type="time" className="input w-32" disabled={h.closed} value={h.open} onChange={(e) => setHour(i, { open: e.target.value })} />
              <span className="text-slate-400">to</span>
              <input type="time" className="input w-32" disabled={h.closed} value={h.close} onChange={(e) => setHour(i, { close: e.target.value })} />
              <label className="flex items-center gap-1.5 text-slate-600">
                <input type="checkbox" checked={h.closed} onChange={(e) => setHour(i, { closed: e.target.checked })} /> Closed
              </label>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={busy} className="btn-primary rounded-full">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {firstSetup ? "Save & continue" : "Save changes"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 size={16} /> Saved
          </span>
        )}
      </div>
    </form>
  );
};

export default SalonProfile;
