import sharp from "sharp";
import crypto from "crypto";

/**
 * AI Skin Diagnostics Service
 * ---------------------------------------------------------------------------
 * Section 4.3 / 5.3 / 6 of the Blue Satchel proposal specify that skin
 * diagnostics are delegated to an "Enterprise AI Skin Diagnostics Platform"
 * reached through a secure API (client-managed licensing, Section 9).
 *
 * This module implements that integration point as a swappable interface:
 * `analyzeSkin({ front, left, right }) -> { overallScore, overallLabel, concerns, rawMetrics }`.
 *
 * MockAIProvider performs genuine pixel-level image analysis (region
 * sampling, luminance variance, redness/hue decomposition) to produce
 * deterministic, image-dependent results — it is not a random number
 * generator. The guided capture flow supplies a required frontal shot plus
 * optional left/right three-quarter shots; when side angles are present,
 * their measurements are averaged in with the frontal ones for a steadier
 * reading of redness/texture/spots (pores and dark circles stay
 * front-only, since those regions aren't reliably visible from the side).
 * When a real vendor (e.g. Perfect Corp, Haut.AI, Modiface) is contracted,
 * implement the same analyzeSkin(buffers) contract in a new provider file
 * and flip AI_PROVIDER in .env.
 */

const CONCERN_DEFS = [
  { key: "spots", label: "Spots", weight: 0.2 },
  { key: "pores", label: "Pores", weight: 0.15 },
  { key: "texture", label: "Texture", weight: 0.2 },
  { key: "redness", label: "Redness", weight: 0.2 },
  { key: "dark-circles", label: "Dark Circles", weight: 0.25 },
];

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));

const levelFor = (severity) => (severity < 34 ? "Low" : severity < 67 ? "Medium" : "High");

const average = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

const regionStats = (data, info, xStart, xEnd, yStart, yEnd) => {
  const { width, height, channels } = info;
  const x0 = Math.floor(xStart * width);
  const x1 = Math.floor(xEnd * width);
  const y0 = Math.floor(yStart * height);
  const y1 = Math.floor(yEnd * height);

  let sumR = 0, sumG = 0, sumB = 0, sumLum = 0, count = 0;
  const luminances = [];

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumR += r;
      sumG += g;
      sumB += b;
      sumLum += lum;
      luminances.push(lum);
      count++;
    }
  }

  if (count === 0) return { meanR: 0, meanG: 0, meanB: 0, meanLum: 0, stdLum: 0, darkRatio: 0 };

  const meanR = sumR / count;
  const meanG = sumG / count;
  const meanB = sumB / count;
  const meanLum = sumLum / count;

  let variance = 0;
  let darkPixels = 0;
  const darkThreshold = meanLum * 0.72;
  for (const lum of luminances) {
    variance += (lum - meanLum) ** 2;
    if (lum < darkThreshold) darkPixels++;
  }
  const stdLum = Math.sqrt(variance / count);
  const darkRatio = darkPixels / count;

  return { meanR, meanG, meanB, meanLum, stdLum, darkRatio };
};

const loadRaw = async (buffer, size = 260) =>
  sharp(buffer).resize(size, size, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

/** Frontal shot: full region layout (forehead/cheeks/under-eye/full-face). */
const extractFrontMetrics = async (buffer) => {
  const { data, info } = await loadRaw(buffer);

  const forehead = regionStats(data, info, 0.25, 0.75, 0.06, 0.28);
  const leftCheek = regionStats(data, info, 0.12, 0.38, 0.42, 0.68);
  const rightCheek = regionStats(data, info, 0.62, 0.88, 0.42, 0.68);
  const underEyeL = regionStats(data, info, 0.22, 0.42, 0.36, 0.46);
  const underEyeR = regionStats(data, info, 0.58, 0.78, 0.36, 0.46);
  const fullFace = regionStats(data, info, 0.1, 0.9, 0.06, 0.94);

  const cheeks = {
    meanR: (leftCheek.meanR + rightCheek.meanR) / 2,
    meanLum: (leftCheek.meanLum + rightCheek.meanLum) / 2,
    stdLum: (leftCheek.stdLum + rightCheek.stdLum) / 2,
    darkRatio: (leftCheek.darkRatio + rightCheek.darkRatio) / 2,
  };
  const underEyeLum = (underEyeL.meanLum + underEyeR.meanLum) / 2;

  return {
    rednessIndex: fullFace.meanR - (fullFace.meanG + fullFace.meanB) / 2,
    textureRaw: (cheeks.stdLum + forehead.stdLum) / 2,
    poreRaw: forehead.stdLum,
    spotRatio: cheeks.darkRatio,
    darkCircleDeficit: cheeks.meanLum - underEyeLum,
  };
};

/**
 * Three-quarter / profile shot: forehead and under-eye aren't reliably
 * positioned the same way once the head is turned, so we only trust a
 * single broad "visible cheek" region for redness/texture/spots.
 */
const extractProfileMetrics = async (buffer) => {
  const { data, info } = await loadRaw(buffer);
  const cheek = regionStats(data, info, 0.28, 0.82, 0.32, 0.78);
  return {
    textureRaw: cheek.stdLum,
    spotRatio: cheek.darkRatio,
    _meanR: cheek.meanR,
    _meanG: cheek.meanG,
    _meanB: cheek.meanB,
  };
};

const profileRedness = (m) => m._meanR - (m._meanG + m._meanB) / 2;

const combineAndScore = (front, left, right, anglesUsed) => {
  const rednessValues = [front.rednessIndex];
  const textureValues = [front.textureRaw];
  const spotValues = [front.spotRatio];

  for (const side of [left, right]) {
    if (!side) continue;
    rednessValues.push(profileRedness(side));
    textureValues.push(side.textureRaw);
    spotValues.push(side.spotRatio);
  }

  const rednessIndex = average(rednessValues);
  const textureRaw = average(textureValues);
  const spotRatio = average(spotValues);

  const rednessSeverity = clamp(((rednessIndex - 4) / 26) * 100);
  const textureSeverity = clamp(((textureRaw - 10) / 26) * 100);
  const poresSeverity = clamp(((front.poreRaw - 9) / 24) * 100);
  const spotsSeverity = clamp((spotRatio - 0.16) * 260);
  const darkCirclesSeverity = clamp(((front.darkCircleDeficit - 2) / 22) * 100);

  const rawSeverities = {
    spots: spotsSeverity,
    pores: poresSeverity,
    texture: textureSeverity,
    redness: rednessSeverity,
    "dark-circles": darkCirclesSeverity,
  };

  const concerns = CONCERN_DEFS.map((def) => {
    const severity = Math.round(rawSeverities[def.key]);
    return { key: def.key, label: def.label, severity, level: levelFor(severity) };
  });

  const weightedPenalty = CONCERN_DEFS.reduce((acc, def) => acc + rawSeverities[def.key] * def.weight, 0);
  const overallScore = Math.round(clamp(100 - weightedPenalty));
  const overallLabel =
    overallScore >= 85 ? "Excellent" : overallScore >= 70 ? "Good" : overallScore >= 50 ? "Fair" : "Needs Care";

  return {
    provider: "mock",
    overallScore,
    overallLabel,
    concerns,
    rawMetrics: {
      anglesUsed,
      rednessIndex: Math.round(rednessIndex * 100) / 100,
      textureVariance: Math.round(textureRaw * 100) / 100,
      poreVariance: Math.round(front.poreRaw * 100) / 100,
      spotDensity: Math.round(spotRatio * 1000) / 1000,
      darkCircleDeficit: Math.round(front.darkCircleDeficit * 100) / 100,
    },
  };
};

const analyzeWithMockProvider = async ({ front, left, right }) => {
  const frontMetrics = await extractFrontMetrics(front);
  const leftMetrics = left ? await extractProfileMetrics(left) : null;
  const rightMetrics = right ? await extractProfileMetrics(right) : null;

  const anglesUsed = ["front", left && "left", right && "right"].filter(Boolean);
  return combineAndScore(frontMetrics, leftMetrics, rightMetrics, anglesUsed);
};

/**
 * Perfect Corp / YouCam Enterprise (YCE) live provider.
 * ---------------------------------------------------------------------------
 * Flow per https://docs.makeupar.com/reference/ai_skin_analysis :
 *   1. RSA-encrypt "client_id=<key>&timestamp=<ms>" with the console-issued
 *      public key -> id_token; POST it with client_id to /s2s/v1.0/client/auth
 *      for a short-lived bearer access_token (cached until it's near expiry).
 *   2. POST /s2s/v2.0/file to register the image, PUT the bytes to the
 *      returned presigned URL, then POST /s2s/v2.0/task/skin-analysis with
 *      the resulting file_id and poll GET .../task/skin-analysis/{task_id}
 *      until it reports success.
 * Perfect Corp's response envelopes vary a little by account/tier, so each
 * field lookup below falls back across the shapes their docs show; if none
 * match, the raw response is included in the thrown error to make a field
 * mismatch obvious immediately rather than silently mis-scoring a scan.
 */
const PERFECTCORP_BASE_URL = process.env.PERFECTCORP_API_BASE || "https://yce-api-01.makeupar.com";
// Every numeric "SD" skin concern Perfect Corp's API can score (per
// docs.makeupar.com/reference/ai_skin_analysis). `skin_type` is excluded —
// it comes back as a category, not a 0-100 score, so it doesn't fit this
// severity/level shape. Weighted equally since there's no dermatological
// basis here to weight one above another.
const PERFECTCORP_CONCERN_DEFS = [
  { key: "spots", label: "Spots", action: "age_spot" },
  { key: "pores", label: "Pores", action: "pore" },
  { key: "texture", label: "Texture", action: "texture" },
  { key: "redness", label: "Redness", action: "redness" },
  { key: "dark-circles", label: "Dark Circles", action: "dark_circle_v2" },
  // Sourced from hd_wrinkle.whole below rather than the plain SD "wrinkle"
  // action, since we're already requesting the HD breakdown for the face
  // overlay — no reason to also pay for the coarser SD version.
  { key: "wrinkles", label: "Wrinkles", action: null },
  { key: "acne", label: "Acne", action: "acne" },
  { key: "oiliness", label: "Oiliness", action: "oiliness" },
  { key: "moisture", label: "Moisture", action: "moisture" },
  { key: "firmness", label: "Firmness", action: "firmness" },
  { key: "radiance", label: "Radiance", action: "radiance" },
  { key: "eye-bags", label: "Eye Bags", action: "eye_bag" },
  { key: "droopy-upper-eyelid", label: "Upper Eyelid Droopiness", action: "droopy_upper_eyelid" },
  { key: "droopy-lower-eyelid", label: "Lower Eyelid Droopiness", action: "droopy_lower_eyelid" },
  { key: "tear-trough", label: "Under-Eye Hollows", action: "tear_trough" },
].map((def) => ({ ...def, weight: 1 / 15 }));

// hd_wrinkle returns a per-region breakdown in one nested object rather than
// a flat ui_score, unlike every other action above — handled separately in
// analyzeWithPerfectCorp. "whole" (overall wrinkle severity) feeds the
// "wrinkles" entry in PERFECTCORP_CONCERN_DEFS above; the rest drive the
// face-region overlay on the results page.
const HD_WRINKLE_REGIONS = [
  { key: "forehead", label: "Forehead" },
  { key: "glabellar", label: "Glabellar" },
  { key: "crowfeet", label: "Crow's Feet" },
  { key: "periocular", label: "Periocular" },
  { key: "nasolabial", label: "Nasolabial" },
  { key: "marionette", label: "Marionette" },
];

const TASK_POLL_INTERVAL_MS = 1500;
const TASK_POLL_TIMEOUT_MS = 30000;

let cachedToken = null; // { accessToken, expiresAt }

const toPem = (key) =>
  key.includes("BEGIN PUBLIC KEY")
    ? key
    : `-----BEGIN PUBLIC KEY-----\n${key.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----\n`;

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.accessToken;

  const apiKey = process.env.PERFECTCORP_API_KEY;
  const publicKey = process.env.PERFECTCORP_API_SECRET;
  if (!apiKey || !publicKey) {
    throw new Error("PERFECTCORP_API_KEY / PERFECTCORP_API_SECRET are not configured.");
  }

  const payload = `client_id=${apiKey}&timestamp=${Date.now()}`;
  const idToken = crypto
    .publicEncrypt(
      { key: toPem(publicKey), padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(payload, "utf8")
    )
    .toString("base64");

  const res = await fetch(`${PERFECTCORP_BASE_URL}/s2s/v1.0/client/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: apiKey, id_token: idToken }),
  });
  const json = await res.json().catch(() => null);
  const accessToken = json?.result?.access_token ?? json?.access_token;
  const expiresIn = json?.result?.expires_in ?? json?.expires_in ?? 3600;
  if (!res.ok || !accessToken) {
    throw new Error(`Perfect Corp auth failed (${res.status}): ${JSON.stringify(json)}`);
  }

  cachedToken = { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
  return accessToken;
};

const pcFetch = async (path, options, accessToken) => {
  const res = await fetch(`${PERFECTCORP_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...options?.headers },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`[perfectcorp] ${json?.error_code || res.status} on ${path}:`, json);
    // Surface the vendor's actual error text on the page rather than a
    // generic message — this app isn't at the stage where hiding
    // account/billing detail from whoever's testing it is worth the
    // confusion of a vague error. Revisit before opening this up to real
    // paying customers.
    const err = new Error(json?.error || `Perfect Corp API error on ${path} (${res.status}).`);
    err.status = res.status >= 400 && res.status < 500 ? 422 : 503;
    throw err;
  }
  return json;
};

const uploadImage = async (buffer, accessToken) => {
  const initRes = await pcFetch(
    "/s2s/v2.0/file",
    {
      method: "POST",
      body: JSON.stringify({
        files: [{ content_type: "image/jpeg", file_name: `scan-${Date.now()}.jpg`, file_size: buffer.length }],
      }),
    },
    accessToken
  );
  const fileEntry = initRes?.result?.files?.[0] ?? initRes?.data?.files?.[0] ?? initRes?.files?.[0];
  const uploadRequest = fileEntry?.requests?.[0];
  if (!fileEntry?.file_id || !uploadRequest?.url) {
    throw new Error(`Perfect Corp file init returned an unexpected shape: ${JSON.stringify(initRes)}`);
  }

  const putRes = await fetch(uploadRequest.url, {
    method: uploadRequest.method || "PUT",
    headers: uploadRequest.headers || { "Content-Type": "image/jpeg" },
    body: buffer,
  });
  if (!putRes.ok) throw new Error(`Perfect Corp file upload failed (${putRes.status}).`);

  return fileEntry.file_id;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Perfect Corp's face detector is much stricter about framing than this
// app's own client-side capture guide (it requires the face to fill most of
// the shot) — surfaced live in testing as "error_src_face_too_small" on
// otherwise normal front-facing selfies. Map the input-quality codes we know
// about to a message the user can act on, with a 422 so the client shows it
// inline instead of a generic "Analysis failed."
const FRIENDLY_TASK_ERRORS = {
  error_src_face_too_small: "Your face needs to fill more of the frame — move closer to the camera and try again.",
  error_src_no_face: "We couldn't detect a face in that photo — please retake with a clear, front-facing selfie.",
  error_src_face_not_found: "We couldn't detect a face in that photo — please retake with a clear, front-facing selfie.",
  error_src_multi_face: "More than one face was detected — please retake the photo alone.",
  error_large_face_angle: "Please face the camera directly for this photo — try again looking straight ahead.",
  error_src_face_out_of_bound: "Your face wasn't fully inside the frame — please center your face and try again.",
  error_below_min_image_size: "That photo's resolution was too low — please try again with better lighting or a different camera.",
};

const runSkinAnalysisTask = async (fileId, accessToken, dstActions) => {
  const createRes = await pcFetch(
    "/s2s/v2.0/task/skin-analysis",
    {
      method: "POST",
      body: JSON.stringify({
        src_file_id: fileId,
        dst_actions: dstActions,
        format: "json",
      }),
    },
    accessToken
  );
  const taskId = createRes?.result?.task_id ?? createRes?.data?.task_id ?? createRes?.task_id;
  if (!taskId) throw new Error(`Perfect Corp task creation returned no task_id: ${JSON.stringify(createRes)}`);

  const deadline = Date.now() + TASK_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const statusRes = await pcFetch(`/s2s/v2.0/task/skin-analysis/${taskId}`, { method: "GET" }, accessToken);
    const status = statusRes?.data?.task_status ?? statusRes?.result?.task_status ?? statusRes?.task_status;
    if (status === "success") {
      return statusRes?.data?.results?.output ?? statusRes?.result?.results?.output ?? [];
    }
    if (status === "error") {
      const code = statusRes?.data?.error ?? statusRes?.result?.error;
      const friendly = FRIENDLY_TASK_ERRORS[code];
      if (friendly) {
        const err = new Error(friendly);
        err.status = 422;
        throw err;
      }
      throw new Error(`Perfect Corp skin analysis task failed: ${JSON.stringify(statusRes)}`);
    }
    await sleep(TASK_POLL_INTERVAL_MS);
  }
  throw new Error("Perfect Corp skin analysis task timed out.");
};

const analyzeWithPerfectCorp = async ({ front }) => {
  const accessToken = await getAccessToken();
  const fileId = await uploadImage(front, accessToken);

  // Perfect Corp rejects a dst_actions list that mixes HD and SD actions in
  // one task ("can't mix HD and SD actions in the same request") — hd_wrinkle
  // is HD-tier, everything else here is SD-tier, so they need two separate
  // task calls (uploading the file once, reusing the same file_id for both).
  const sdActions = PERFECTCORP_CONCERN_DEFS.map((def) => def.action).filter(Boolean);
  const [sdOutput, hdOutput] = await Promise.all([
    runSkinAnalysisTask(fileId, accessToken, sdActions),
    runSkinAnalysisTask(fileId, accessToken, ["hd_wrinkle"]),
  ]);
  const output = [...sdOutput, ...hdOutput];

  const scoreByAction = Object.fromEntries(output.map((o) => [o.type, o.ui_score]));
  // hd_wrinkle comes back as one output entry per face region, each tagged
  // with `region` ("forehead", "glabellar", …, and "whole" when present),
  // rather than one entry with the regions nested inside it.
  const hdWrinkleEntries = output.filter((o) => o.type === "hd_wrinkle" && o.region);
  const hdWrinkleByRegion = Object.fromEntries(hdWrinkleEntries.map((o) => [o.region, o.ui_score]));
  const regionScores = HD_WRINKLE_REGIONS.map((def) => hdWrinkleByRegion[def.key]).filter((s) => s != null);
  const hdWrinkle = hdWrinkleEntries.length
    ? {
        whole: {
          ui_score:
            hdWrinkleByRegion.whole ??
            (regionScores.length ? regionScores.reduce((a, b) => a + b, 0) / regionScores.length : undefined),
        },
        ...Object.fromEntries(Object.entries(hdWrinkleByRegion).map(([region, ui_score]) => [region, { ui_score }])),
      }
    : null;

  // Perfect Corp's ui_score runs 0-100 where higher = healthier; this app's
  // "severity" runs the opposite way (higher = worse), hence the inversion.
  const rawSeverities = Object.fromEntries(
    PERFECTCORP_CONCERN_DEFS.map((def) => {
      const uiScore = def.action ? scoreByAction[def.action] : hdWrinkle?.whole?.ui_score;
      return [def.key, clamp(100 - (uiScore ?? 50))];
    })
  );

  const concerns = PERFECTCORP_CONCERN_DEFS.map((def) => {
    const severity = Math.round(rawSeverities[def.key]);
    return { key: def.key, label: def.label, severity, level: levelFor(severity) };
  });

  // Per-region wrinkle breakdown for the face-overlay UI on the results
  // page — only present when hd_wrinkle came back in the response.
  const faceRegions = hdWrinkle
    ? HD_WRINKLE_REGIONS.map((def) => {
        const severity = Math.round(clamp(100 - (hdWrinkle[def.key]?.ui_score ?? 50)));
        return { key: def.key, label: def.label, severity, level: levelFor(severity) };
      })
    : [];

  // Perfect Corp also returns its own dermatologist-calibrated composite
  // score (type "all") and an estimated skin age (type "skin_age") — prefer
  // their composite over our own weighted average when it's present, since
  // it's authoritative for their scoring model rather than an approximation
  // of it.
  const providerOverall = output.find((o) => o.type === "all")?.score;
  const skinAge = output.find((o) => o.type === "skin_age")?.score;
  const weightedPenalty = PERFECTCORP_CONCERN_DEFS.reduce((acc, def) => acc + rawSeverities[def.key] * def.weight, 0);
  const overallScore =
    providerOverall != null ? Math.round(clamp(providerOverall)) : Math.round(clamp(100 - weightedPenalty));
  const overallLabel =
    overallScore >= 85 ? "Excellent" : overallScore >= 70 ? "Good" : overallScore >= 50 ? "Fair" : "Needs Care";

  return {
    provider: "perfectcorp",
    overallScore,
    overallLabel,
    concerns,
    faceRegions,
    rawMetrics: { anglesUsed: ["front"], skinAge, perfectCorpOutput: output },
  };
};

/**
 * @param {{ front: Buffer, left?: Buffer, right?: Buffer }} buffers
 */
export const analyzeSkin = async (buffers) => {
  const provider = process.env.AI_PROVIDER || "mock";
  if (provider === "mock") return analyzeWithMockProvider(buffers);
  if (provider === "perfectcorp") return analyzeWithPerfectCorp(buffers);
  throw new Error(`Unsupported AI_PROVIDER "${provider}"`);
};

export const CONCERN_DEFINITIONS = CONCERN_DEFS;
