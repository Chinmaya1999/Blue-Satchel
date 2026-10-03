import { useEffect, useRef, useState } from "react";
import { Camera, X, SwitchCamera } from "lucide-react";

// Live camera in a modal. Calls onCapture(File) with a JPEG of the current frame.
const CameraCapture = ({ onCapture, onClose, label = "Take photo" }) => {
  const video = useRef(null);
  const stream = useRef(null);
  const [facing, setFacing] = useState("user");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't open the camera. Use the upload option instead.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().then(() => setReady(true)).catch(() => {});
        }
      })
      .catch(() => !cancelled && setError("Couldn't access the camera. Allow camera permission in your browser, or upload a photo instead."));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [facing]);

  const snap = () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    // Front camera preview is mirrored; save the photo the right way round.
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <p className="text-sm font-semibold">{label}</p>
          <button onClick={onClose} aria-label="Close camera" className="rounded-full p-1.5 hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="relative aspect-[3/4] bg-black">
          {error ? (
            <p className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">{error}</p>
          ) : (
            <>
              <video ref={video} playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
              <div className="pointer-events-none absolute inset-8 rounded-[40%] border-2 border-dashed border-white/50" />
              {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">Starting camera…</p>}
            </>
          )}
        </div>
        <div className="flex items-center justify-center gap-6 px-4 py-4">
          <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Switch camera" className="rounded-full p-3 text-white ring-1 ring-white/20 hover:bg-white/10"><SwitchCamera size={18} /></button>
          <button onClick={snap} disabled={!ready} aria-label="Capture" className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-900 ring-4 ring-white/30 transition active:scale-95 disabled:opacity-40"><Camera size={24} /></button>
          <span className="w-11" />
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
