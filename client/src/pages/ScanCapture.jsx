import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import * as faceapi from "face-api.js";
import {
  Camera,
  Upload,
  RotateCw,
  ScanFace,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Target,
  CircleDot,
  Layers,
  Flame,
  Moon,
  Circle,
  Zap,
  ZapOff,
  ChevronLeft,
  Volume2,
  VolumeX,
  SkipForward,
} from "lucide-react";
import api from "../api/axios.js";

const CHECKLIST = [
  { key: "spots", icon: Target, label: "Spots & blemishes", desc: "Scanning for localized dark spots and blemish density." },
  { key: "pores", icon: CircleDot, label: "Pore visibility", desc: "Measuring pore size and concentration across your T-zone." },
  { key: "texture", icon: Layers, label: "Skin texture", desc: "Checking surface smoothness and unevenness." },
  { key: "redness", icon: Flame, label: "Redness", desc: "Evaluating tone balance and reactive areas." },
  { key: "dark-circles", icon: Moon, label: "Dark circles", desc: "Comparing under-eye brightness to the rest of your face." },
];

const ANALYSIS_STEPS = [
  "Detecting facial regions…",
  "Measuring pore visibility…",
  "Analyzing skin texture…",
  "Checking redness levels…",
  "Evaluating dark circles…",
];

// --- Guided capture ---------------------------------------------------------
// Real face detection (TinyFaceDetector) plus 68-point eye landmarks, run
// entirely client-side via face-api.js/TensorFlow.js — not a color guess.
// The wizard walks through three angles (front, left, right); each shot only
// auto-captures once we've verified a real face is detected, centered (or,
// for the side steps, turned to the right angle via landmark geometry),
// well lit, holding steady and — on the front step — that a natural eye
// blink has been observed (liveness: a static photo can't blink or
// convincingly rotate through three angles). Voice-over narrates each step
// via the browser's built-in speech synthesis; on-screen captions mirror it
// for when audio is off or unsupported.
const MODEL_URL = "/models";
const DETECT_INTERVAL_MS = 280;
const HOLD_DURATION_MS = 700;
const BLINK_FALLBACK_MS = 2600;
const MIN_BRIGHTNESS = 40;
const MAX_BRIGHTNESS = 245;
const MAX_BOX_DRIFT = 0.09;
const EAR_CLOSED = 0.19;
const EAR_OPEN = 0.24;
const LEFT_YAW_MIN = 0.66;
const RIGHT_YAW_MAX = 0.34;
// The front shot is the one sent to the live AI provider, which requires the
// face to fill most of the frame — much closer than side angles need to be.
const FRONT_MIN_WIDTH_RATIO = 0.5;
const SIDE_MIN_WIDTH_RATIO = 0.12;
const MAX_WIDTH_RATIO = 0.85;

const STEP_ORDER = ["front", "left", "right"];
const STEPS = {
  front: {
    label: "Front",
    prompt: "Please look straight at the camera, and center your face inside the circle.",
    instruction: "Look straight ahead and center your face",
    captured: "Great, got your front view.",
  },
  left: {
    label: "Left side",
    prompt: "Now, slowly turn your head to your left.",
    instruction: "Turn slowly to your left",
    captured: "Perfect, got your left side.",
  },
  right: {
    label: "Right side",
    prompt: "Now, slowly turn your head to your right.",
    instruction: "Turn slowly to your right",
    captured: "Excellent, got your right side.",
  },
};

const POSTURE_TEXT = {
  searching: "No face detected — position your face in the frame",
  align: "Move closer and center your face in the frame",
  dim: "Move to better lighting",
  bright: "Too much direct light — step back a little",
  holding: "Hold that position…",
  blink: "Blink naturally so we can confirm it's you…",
  locking: "Perfect — capturing…",
};

const dist2d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Standard eye-aspect-ratio (EAR) from Soukupová & Čech's blink-detection
// method, given the 6 landmark points face-api returns per eye.
const eyeAspectRatio = (eye) => {
  const a = dist2d(eye[1], eye[5]);
  const b = dist2d(eye[2], eye[4]);
  const c = dist2d(eye[0], eye[3]);
  return c === 0 ? 0 : (a + b) / (2 * c);
};

const sampleBrightness = (video, canvas) => {
  if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return null;
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / (data.length / 4);
};

// The "Upload a photo instead" fallback bypasses the guided camera's
// fixed-size canvas capture entirely, so a small source photo (thumbnail,
// screenshot, etc.) would otherwise be sent to the live AI provider as-is —
// this mirrors capturePhoto's fixed OUTPUT_SIZE canvas so both paths give
// the provider the same guaranteed-adequate resolution.
const normalizeUploadedImage = (file) =>
  new Promise((resolve, reject) => {
    const OUTPUT_SIZE = 640;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      const scale = Math.max(OUTPUT_SIZE / img.width, OUTPUT_SIZE / img.height);
      const sw = OUTPUT_SIZE / scale;
      const sh = OUTPUT_SIZE / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image."))), "image/jpeg", 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that image file."));
    };
    img.src = objectUrl;
  });

const speakText = (text) => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
};

const ScanCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");

  const [modelsReady, setModelsReady] = useState(false);
  const [detectorError, setDetectorError] = useState("");
  const [autoCapture, setAutoCapture] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const [flowStage, setFlowStage] = useState("intro"); // intro | front | left | right | submitting
  const [shots, setShots] = useState({ front: null, left: null, right: null });
  const [posture, setPosture] = useState("searching");
  const [caption, setCaption] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const [flash, setFlash] = useState(false);

  const shotsRef = useRef({ front: null, left: null, right: null });
  const prevBoxCenterRef = useRef(null);
  const lastFaceBoxRef = useRef(null);
  const eyeStateRef = useRef("open");
  const blinkDetectedRef = useRef(false);
  const holdStartRef = useRef(null);
  const capturingRef = useRef(false);

  const speak = useCallback((text) => {
    if (voiceEnabled) speakText(text);
  }, [voiceEnabled]);

  // Camera
  useEffect(() => {
    let active = true;

    // getUserMedia only exists in "secure contexts" (HTTPS, or localhost).
    // On a plain-HTTP origin, navigator.mediaDevices is undefined and the
    // optional-chained call below would otherwise short-circuit silently —
    // no error, no ready state, just an infinite "Starting camera…".
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        window.isSecureContext === false
          ? "Camera requires a secure (HTTPS) connection — upload a photo instead."
          : "Camera access unavailable in this browser — upload a photo instead."
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } } })
      .then((stream) => {
        // If cleanup already ran by the time this resolves (e.g. React
        // StrictMode's dev-only double-invoke of effects), release this
        // stream immediately instead of leaving the camera capture running
        // with no reference to it.
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      })
      .catch(() => setCameraError("Camera access unavailable — upload a photo instead."));

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Face detector models
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
        if (!cancelled) setModelsReady(true);
      } catch {
        if (!cancelled) setDetectorError("Face detector unavailable — use manual capture instead.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setStepIndex((i) => (i < ANALYSIS_STEPS.length - 1 ? i + 1 : i));
    }, 750);
    return () => clearInterval(interval);
  }, [submitting]);

  const submitAllShots = useCallback(async () => {
    const { front, left, right } = shotsRef.current;
    if (!front?.blob) return;
    setFlowStage("submitting");
    setSubmitting(true);
    setStepIndex(0);
    setError("");
    try {
      const formData = new FormData();
      formData.append("front", front.blob, "front.jpg");
      if (left?.blob) formData.append("left", left.blob, "left.jpg");
      if (right?.blob) formData.append("right", right.blob, "right.jpg");
      const { data } = await api.post("/scans", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/scan/${data.scan._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed. Please try again.");
      setSubmitting(false);
      setFlowStage(STEP_ORDER[STEP_ORDER.length - 1]);
    }
  }, [navigate]);

  const advanceStage = useCallback(
    (fromStage) => {
      const idx = STEP_ORDER.indexOf(fromStage);
      const next = STEP_ORDER[idx + 1];
      if (next) {
        setTimeout(() => {
          setFlowStage(next);
          speak(STEPS[next].prompt);
        }, 900);
      } else {
        setTimeout(() => {
          speak("All done! Analyzing your skin now.");
          submitAllShots();
        }, 900);
      }
    },
    [speak, submitAllShots]
  );

  const capturePhoto = useCallback(
    (stage) => {
      // Locked until the *next* stage's effect resets it — not just until
      // this blob finishes saving. Otherwise the still-running detection
      // loop for this same stage can fire again a moment later (the stage
      // transition has a deliberate ~900ms pause for the voice line),
      // causing repeated captures and repeated speech.
      if (capturingRef.current || shotsRef.current[stage]) return;
      capturingRef.current = true;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const maxSize = Math.min(video.videoWidth, video.videoHeight);

      // The front shot is the one sent to the live AI provider, which
      // requires the face to fill most of the frame (much stricter than
      // this app's own capture-guide threshold) — crop tightly around the
      // already-detected face box instead of the full centered frame so
      // that requirement is met regardless of how close the user physically
      // sits. FACE_CROP_RATIO leaves a comfortable margin above the
      // provider's ~60%-of-width minimum.
      const FACE_CROP_RATIO = 0.78;
      const box = stage === "front" ? lastFaceBoxRef.current : null;
      let size = maxSize;
      let sx = (video.videoWidth - size) / 2;
      let sy = (video.videoHeight - size) / 2;
      if (box) {
        size = Math.min(maxSize, Math.round(box.width / FACE_CROP_RATIO));
        sx = Math.max(0, Math.min(Math.round(box.x + box.width / 2 - size / 2), video.videoWidth - size));
        sy = Math.max(0, Math.min(Math.round(box.y + box.height / 2 - size / 2), video.videoHeight - size));
      }

      // Output canvas is always a fixed size — a tight face crop can shrink
      // the *source* pixel region well below the AI provider's minimum
      // resolution requirement, so the crop is upscaled into this canvas
      // rather than sized to match it 1:1.
      const OUTPUT_SIZE = 640;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      ctx.translate(OUTPUT_SIZE, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(
        (blob) => {
          const previewUrl = URL.createObjectURL(blob);
          shotsRef.current = { ...shotsRef.current, [stage]: { blob, previewUrl } };
          setShots(shotsRef.current);
          speak(STEPS[stage].captured);
          advanceStage(stage);
        },
        "image/jpeg",
        0.92
      );
    },
    [speak, advanceStage]
  );

  // Live detection loop for whichever step is active
  useEffect(() => {
    const isCaptureStage = STEP_ORDER.includes(flowStage);
    if (!cameraReady || cameraError || submitting || !modelsReady || !isCaptureStage) return;

    let cancelled = false;
    let timeoutId;
    prevBoxCenterRef.current = null;
    lastFaceBoxRef.current = null;
    if (flowStage === "front") {
      eyeStateRef.current = "open";
      blinkDetectedRef.current = false;
    }
    holdStartRef.current = null;
    capturingRef.current = false;
    setHoldProgress(0);
    setPosture("searching");
    setCaption(POSTURE_TEXT.searching);

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

    const resetHold = (nextPosture, nextCaption) => {
      holdStartRef.current = null;
      setHoldProgress(0);
      setPosture(nextPosture);
      setCaption(nextCaption);
    };

    const tick = async () => {
      if (cancelled || capturingRef.current) {
        if (!cancelled) timeoutId = setTimeout(tick, DETECT_INTERVAL_MS);
        return;
      }
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth) {
        try {
          const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks(true);

          if (!result) {
            blinkDetectedRef.current = false;
            prevBoxCenterRef.current = null;
            lastFaceBoxRef.current = null;
            resetHold("searching", POSTURE_TEXT.searching);
          } else {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const box = result.detection.box;
            lastFaceBoxRef.current = { x: box.x, y: box.y, width: box.width, height: box.height };
            const cx = (vw - (box.x + box.width / 2)) / vw;
            const cy = (box.y + box.height / 2) / vh;
            const widthRatio = box.width / vw;

            const positions = result.landmarks.positions;
            const jawLeft = positions[0];
            const jawRight = positions[16];
            const nose = positions[30];
            const jawSpan = jawRight.x - jawLeft.x;
            const yawRatio = jawSpan !== 0 ? (nose.x - jawLeft.x) / jawSpan : 0.5;

            const brightness = sampleBrightness(video, analysisCanvasRef.current);
            const tooDim = brightness != null && brightness < MIN_BRIGHTNESS;
            const tooBright = brightness != null && brightness > MAX_BRIGHTNESS;

            let steady = true;
            if (prevBoxCenterRef.current) {
              steady = Math.hypot(cx - prevBoxCenterRef.current.x, cy - prevBoxCenterRef.current.y) < MAX_BOX_DRIFT;
            }
            prevBoxCenterRef.current = { x: cx, y: cy };

            const leftEye = result.landmarks.getLeftEye();
            const rightEye = result.landmarks.getRightEye();
            const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
            if (ear < EAR_CLOSED) {
              eyeStateRef.current = "closed";
            } else if (ear > EAR_OPEN && eyeStateRef.current === "closed") {
              eyeStateRef.current = "open";
              blinkDetectedRef.current = true;
            }

            const minWidthRatio = flowStage === "front" ? FRONT_MIN_WIDTH_RATIO : SIDE_MIN_WIDTH_RATIO;
            const sizeOk = widthRatio > minWidthRatio && widthRatio < MAX_WIDTH_RATIO;
            const verticalOk = cy > 0.1 && cy < 0.9;

            let positioned = false;
            if (flowStage === "front") positioned = sizeOk && verticalOk && cx > 0.24 && cx < 0.76;
            else if (flowStage === "left") positioned = sizeOk && verticalOk && yawRatio >= LEFT_YAW_MIN;
            else if (flowStage === "right") positioned = sizeOk && verticalOk && yawRatio <= RIGHT_YAW_MAX;

            if (!sizeOk || !verticalOk) {
              if (flowStage === "front") blinkDetectedRef.current = false;
              resetHold("align", POSTURE_TEXT.align);
            } else if (tooDim) {
              resetHold("dim", POSTURE_TEXT.dim);
            } else if (tooBright) {
              resetHold("bright", POSTURE_TEXT.bright);
            } else if (!positioned) {
              resetHold("align", STEPS[flowStage].instruction);
            } else if (!steady) {
              resetHold("holding", POSTURE_TEXT.holding);
            } else {
              // Positioned, lit and steady. A blink is a fast-path liveness
              // signal (captures almost immediately once seen) but isn't a
              // hard blocker — holding a good, steady position on its own
              // is treated as sufficient after a slightly longer wait, so
              // this never gets stuck forever if a blink isn't caught.
              const waitingForBlink = flowStage === "front" && !blinkDetectedRef.current;
              if (!holdStartRef.current) holdStartRef.current = Date.now();
              const heldMs = Date.now() - holdStartRef.current;
              const target = waitingForBlink ? BLINK_FALLBACK_MS : HOLD_DURATION_MS;
              const pct = Math.min(100, Math.round((heldMs / target) * 100));
              setHoldProgress(pct);
              setPosture(waitingForBlink ? "blink" : "locking");
              setCaption(waitingForBlink ? POSTURE_TEXT.blink : POSTURE_TEXT.locking);

              if (pct >= 100 && autoCapture && !capturingRef.current) {
                setFlash(true);
                setTimeout(() => setFlash(false), 200);
                capturePhoto(flowStage); // sets capturingRef.current itself
              }
            }
          }
        } catch {
          // Transient detection hiccup — try again next tick.
        }
      }
      if (!cancelled) timeoutId = setTimeout(tick, DETECT_INTERVAL_MS);
    };

    timeoutId = setTimeout(tick, DETECT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [cameraReady, cameraError, submitting, modelsReady, flowStage, autoCapture, capturePhoto]);

  const startGuidedScan = () => {
    setFlowStage("front");
    speak(STEPS.front.prompt);
  };

  const skipStage = () => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    advanceStage(flowStage);
  };

  const startOver = () => {
    Object.values(shotsRef.current).forEach((s) => s?.previewUrl && URL.revokeObjectURL(s.previewUrl));
    shotsRef.current = { front: null, left: null, right: null };
    setShots(shotsRef.current);
    setError("");
    setFlowStage("intro");
    window.speechSynthesis?.cancel();
  };

  const onFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await normalizeUploadedImage(file);
      shotsRef.current = { ...shotsRef.current, front: { blob, previewUrl: URL.createObjectURL(blob) } };
      setShots(shotsRef.current);
      submitAllShots();
    } catch {
      setError("That file couldn't be used — please try a different photo.");
    }
  };

  const progressPct = submitting ? ((stepIndex + 1) / ANALYSIS_STEPS.length) * 100 : 0;
  const isCaptureStage = STEP_ORDER.includes(flowStage);
  const currentShot = isCaptureStage ? shots[flowStage] : null;

  const statusLabel = submitting
    ? "Analyzing…"
    : cameraError
    ? "Camera unavailable"
    : cameraReady && !modelsReady && !detectorError
    ? "Loading face detector…"
    : cameraReady
    ? "Camera live"
    : "Starting camera…";
  const statusDot = submitting
    ? "bg-brand-500 animate-pulse"
    : cameraError
    ? "bg-rose-400"
    : cameraReady && !modelsReady && !detectorError
    ? "bg-amber-400 animate-pulse"
    : cameraReady
    ? "bg-emerald-500 animate-pulse"
    : "bg-slate-300 animate-pulse";

  const postureColor =
    posture === "locking"
      ? "border-emerald-400"
      : posture === "holding" || posture === "blink"
      ? "border-amber-400"
      : posture === "dim" || posture === "bright"
      ? "border-amber-300"
      : "border-white/55";

  const corner = (posClasses, sides) => (
    <div
      className={`pointer-events-none absolute h-9 w-9 ${posClasses} ${postureColor} transition-colors duration-300`}
      style={{
        borderStyle: "solid",
        borderTopWidth: sides.includes("t") ? 3 : 0,
        borderBottomWidth: sides.includes("b") ? 3 : 0,
        borderLeftWidth: sides.includes("l") ? 3 : 0,
        borderRightWidth: sides.includes("r") ? 3 : 0,
        borderTopLeftRadius: sides === "tl" ? 14 : 0,
        borderTopRightRadius: sides === "tr" ? 14 : 0,
        borderBottomLeftRadius: sides === "bl" ? 14 : 0,
        borderBottomRightRadius: sides === "br" ? 14 : 0,
      }}
    />
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-white lg:flex-row">
      {/* Camera pane — full bleed */}
      <div className="relative flex-1 overflow-hidden bg-slate-950 lg:flex-[1.4]">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-300">
            <AlertCircle size={28} />
            {cameraError}
          </div>
        ) : (
          <>
            {/* Always mounted — swapping this for an <img> on capture would
                remount the element and drop the camera's srcObject. */}
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            {currentShot && (
              <img
                src={currentShot.previewUrl}
                alt={`${flowStage} capture`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </>
        )}

        {flash && <div className="absolute inset-0 bg-white" style={{ opacity: 0.85 }} />}

        {/* Top overlay bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-slate-900/70 to-transparent p-5">
          <button
            onClick={() => navigate(-1)}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <ChevronLeft size={14} /> Back
          </button>

          {isCaptureStage ? (
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              {STEP_ORDER.map((s) => (
                <span
                  key={s}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    s === flowStage ? "bg-white" : shots[s] ? "bg-emerald-400" : "bg-white/30"
                  }`}
                />
              ))}
              <span className="ml-1 text-[11px] font-semibold text-white">
                Step {STEP_ORDER.indexOf(flowStage) + 1} of {STEP_ORDER.length} — {STEPS[flowStage].label}
              </span>
            </div>
          ) : (
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              <ScanFace size={13} /> AI Skin Assessment
            </span>
          )}

          <div className="pointer-events-auto flex items-center gap-2">
            {flowStage !== "intro" && (
              <button
                onClick={startOver}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/20"
              >
                <RotateCw size={13} />
              </button>
            )}
            <button
              onClick={() => setVoiceEnabled((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/20"
            >
              {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
            {isCaptureStage && (
              <button
                onClick={() => setAutoCapture((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm transition ${
                  autoCapture ? "bg-brand-600/90 text-white" : "bg-white/15 text-white/80"
                }`}
              >
                {autoCapture ? <Zap size={12} /> : <ZapOff size={12} />} Auto {autoCapture ? "on" : "off"}
              </button>
            )}
          </div>
        </div>

        {/* Error banners live here (not just the desktop info pane) so
            they're reachable on mobile, where that pane is hidden. */}
        {(error || detectorError) && (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex flex-col gap-2 px-4 sm:top-20">
            {error && (
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-rose-50/95 px-3 py-2.5 text-sm text-rose-700 shadow-lg backdrop-blur-sm">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}
            {detectorError && (
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-amber-50/95 px-3 py-2.5 text-sm text-amber-700 shadow-lg backdrop-blur-sm">
                <AlertCircle size={15} className="shrink-0" /> {detectorError}
              </div>
            )}
          </div>
        )}

        {isCaptureStage && !currentShot && !cameraError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Sized so "fill this oval" roughly matches FRONT_MIN_WIDTH_RATIO
                for the front step — the live AI provider needs a much
                closer, larger face than the side angles do. */}
            <div
              className={`relative min-w-[220px] ${
                flowStage === "front" ? "h-[85%] w-[56%]" : "h-[64%] w-[42%]"
              }`}
            >
              <div className={`h-full w-full rounded-[50%] border-2 border-dashed transition-colors duration-300 ${postureColor}`} />
              {corner("-top-1 -left-1", "tl")}
              {corner("-top-1 -right-1", "tr")}
              {corner("-bottom-1 -left-1", "bl")}
              {corner("-bottom-1 -right-1", "br")}
            </div>
          </div>
        )}

        {/* Intro overlay — shown even if the camera failed, so "Upload a
            photo instead" is always reachable rather than a dead end. */}
        {flowStage === "intro" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 p-6 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white/95 p-6 text-center shadow-2xl backdrop-blur">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <ScanFace size={22} />
              </span>
              <h2 className="font-display text-lg font-bold text-slate-900">Guided AI Skin Scan</h2>

              {cameraError ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-left text-sm text-rose-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {cameraError}
                </div>
              ) : (
                <>
                  <p className="mt-1.5 text-sm text-slate-500">
                    I'll talk you through it — front, then a slow turn left and right — and capture each angle automatically.
                  </p>
                  <div className="mt-5 flex justify-center gap-4">
                    {STEP_ORDER.map((s, i) => (
                      <div key={s} className="flex flex-col items-center gap-1.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                          {i + 1}
                        </span>
                        <span className="text-[11px] text-slate-500">{STEPS[s].label}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={startGuidedScan}
                    disabled={!cameraReady || !modelsReady}
                    className="btn-primary mt-6 w-full"
                  >
                    {!cameraReady ? "Starting camera…" : !modelsReady ? "Loading face detector…" : "Start guided scan"}
                  </button>
                </>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className={cameraError ? "btn-primary mt-4 w-full" : "mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600"}
              >
                <Upload size={cameraError ? 15 : 13} /> Upload a photo instead
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
            </div>
          </div>
        )}

        {/* Bottom overlay: status + controls */}
        {!cameraError && flowStage !== "intro" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent px-5 pb-6 pt-16">
            {isCaptureStage && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-center text-sm font-medium text-white">{caption}</p>
                {posture === "locking" && (
                  <div className="h-1 w-36 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-150"
                      style={{ width: `${holdProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {isCaptureStage && (
              <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md ring-1 ring-white/15">
                <button
                  onClick={() => capturePhoto(flowStage)}
                  className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 shadow-soft transition hover:bg-brand-50"
                >
                  <Camera size={16} /> Capture now
                </button>
                {flowStage !== "front" && (
                  <button
                    onClick={skipStage}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <SkipForward size={15} /> Skip
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {submitting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/75 backdrop-blur-sm">
            <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
            <p className="px-6 text-center text-sm font-medium text-white">{ANALYSIS_STEPS[stepIndex]}</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={analysisCanvasRef} className="hidden" />
      </div>

      {/* Info pane — desktop-only sidebar. On mobile the camera pane above
          is the whole experience (see the top-bar Start over / error
          banners added there for parity), rather than splitting a short
          viewport between a cramped video and this pane's full content
          height. */}
      <div className="hidden lg:flex lg:w-[400px] lg:flex-col lg:overflow-y-auto lg:border-l lg:border-slate-100 lg:p-8 xl:w-[440px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Let's scan your skin</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              A guided, voice-narrated scan from three angles for a steadier reading.
            </p>
          </div>
          {flowStage !== "intro" && (
            <button
              onClick={startOver}
              className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
            >
              <RotateCw size={12} /> Start over
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusDot}`} />
            <span className="text-sm font-semibold text-slate-700">{statusLabel}</span>
          </div>
          {submitting && <span className="text-xs font-semibold text-brand-600">{Math.round(progressPct)}%</span>}
        </div>

        {submitting && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-brand-600"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}

        {!submitting && (
          <>
            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Captured angles</p>
            <div className="grid grid-cols-3 gap-3">
              {STEP_ORDER.map((s) => (
                <div
                  key={s}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 transition ${
                    shots[s] ? "border-emerald-200" : flowStage === s ? "border-brand-300 bg-brand-50" : "border-dashed border-slate-200"
                  }`}
                >
                  {shots[s] ? (
                    <>
                      <img src={shots[s].previewUrl} alt={STEPS[s].label} className="h-full w-full object-cover" />
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <CheckCircle2 size={12} />
                      </span>
                    </>
                  ) : (
                    <>
                      <ScanFace size={18} className={flowStage === s ? "text-brand-400" : "text-slate-300"} />
                      <span className={`text-[10px] font-medium ${flowStage === s ? "text-brand-600" : "text-slate-400"}`}>
                        {STEPS[s].label}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {flowStage === "intro" && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-brand-50 p-4">
            <Sparkles size={17} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-sm font-medium text-brand-900">
              Good lighting and a clear view of your face (glasses off, if you can) give the most accurate reading.
            </p>
          </div>
        )}

        {submitting && (
          <>
            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">What our AI checks</p>
            <div className="space-y-2">
              {CHECKLIST.map((item, idx) => {
                const isDone = idx < stepIndex;
                const isActive = idx === stepIndex;
                return (
                  <motion.div
                    key={item.key}
                    animate={{
                      scale: isActive ? 1.02 : 1,
                      borderColor: isActive ? "#8fb3ff" : isDone ? "#a7f3d0" : "#f1f5f9",
                      backgroundColor: isActive ? "#eef4ff" : isDone ? "#ecfdf5" : "#ffffff",
                    }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 rounded-xl border p-3"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isDone ? "bg-emerald-500 text-white" : isActive ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={16} /> : <item.icon size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${isActive || isDone ? "text-slate-900" : "text-slate-600"}`}>
                        {item.label}
                      </p>
                      <p className="truncate text-xs text-slate-400">{item.desc}</p>
                    </div>
                    {isActive && (
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity }}>
                        <Circle size={9} className="fill-brand-500 text-brand-500" />
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          Results include an overall skin health score out of 100, a severity breakdown for each concern, and a
          personalized product routine — the left and right views help steady the redness, texture and spots
          readings beyond what a single front photo can show.
        </div>

        <p className="mt-auto pt-6 text-center text-xs text-slate-400">
          Your photos are analyzed securely and stored only in your scan history.
        </p>
      </div>
    </div>
  );
};

export default ScanCapture;
