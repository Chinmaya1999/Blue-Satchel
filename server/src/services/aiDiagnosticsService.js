import sharp from "sharp";

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
 * @param {{ front: Buffer, left?: Buffer, right?: Buffer }} buffers
 */
export const analyzeSkin = async (buffers) => {
  const provider = process.env.AI_PROVIDER || "mock";
  if (provider === "mock") return analyzeWithMockProvider(buffers);
  // Future real-vendor branches would be added here, e.g.:
  // if (provider === "perfectcorp") return analyzeWithPerfectCorp(buffers);
  throw new Error(`Unsupported AI_PROVIDER "${provider}"`);
};

export const CONCERN_DEFINITIONS = CONCERN_DEFS;
