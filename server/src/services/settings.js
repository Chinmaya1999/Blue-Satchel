import AppSetting from "../models/AppSetting.js";

/**
 * Admin-controlled site settings, cached in memory so pricing checks on every
 * request don't hit the database. The cache is refreshed whenever an admin
 * changes a setting and every 30s besides — during a blue/green deploy two
 * server containers run briefly, and the periodic refresh keeps the other
 * one in step.
 */
const DEFAULTS = { quickScanFree: false, detailedScanFree: false, shopEnabled: false };
let cache = { ...DEFAULTS };

const toPlain = (doc) => ({
  quickScanFree: Boolean(doc?.quickScanFree),
  detailedScanFree: Boolean(doc?.detailedScanFree),
  shopEnabled: Boolean(doc?.shopEnabled),
  updatedAt: doc?.updatedAt ?? null,
  updatedBy: doc?.updatedBy ?? null,
});

export const loadSettings = async () => {
  const doc = await AppSetting.findOne({ key: "global" }).populate("updatedBy", "name");
  cache = toPlain(doc);
  return cache;
};

export const getSettings = () => cache;

export const updateSettings = async (patch, adminId) => {
  const update = { updatedBy: adminId };
  for (const key of ["quickScanFree", "detailedScanFree", "shopEnabled"]) {
    if (typeof patch[key] === "boolean") update[key] = patch[key];
  }
  await AppSetting.findOneAndUpdate({ key: "global" }, update, { upsert: true, setDefaultsOnInsert: true });
  return loadSettings();
};

export const startSettingsRefresh = () => {
  const timer = setInterval(() => loadSettings().catch(() => {}), 30000);
  timer.unref();
};
