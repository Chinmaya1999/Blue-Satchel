import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import api from "../../api/axios.js";

// Uploads one image to the server and reports its URL. `shape` only changes the preview.
const ImageUpload = ({ value, onChange, label = "Upload image", shape = "square", endpoint = "/salon/upload", className = "h-24 w-24" }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api.post(endpoint, form);
      onChange(data.url);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-brand-400 hover:text-brand-600 ${shape === "round" ? "rounded-full" : "rounded-2xl"} ${className}`}
        >
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={22} />}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 size={20} className="animate-spin" />
            </span>
          )}
        </button>
        <div className="text-xs text-slate-500">
          <button type="button" onClick={() => input.current?.click()} className="font-semibold text-brand-600 hover:underline">
            {value ? "Change" : label}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="ml-3 inline-flex items-center gap-0.5 text-slate-400 hover:text-rose-600">
              <X size={12} /> Remove
            </button>
          )}
          <p className="mt-0.5">JPG, PNG or WebP, up to 8 MB</p>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
    </div>
  );
};

export default ImageUpload;
