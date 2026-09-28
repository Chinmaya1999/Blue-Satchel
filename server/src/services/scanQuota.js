import User from "../models/User.js";

// Each customer may run this many scans per calendar day (India time).
// Admins are exempt.
export const DAILY_SCAN_LIMIT = 2;

export const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD

export const scansUsedToday = (user) => (user.scanQuota?.day === todayKey() ? user.scanQuota.count : 0);

export const quotaFor = (user) => {
  if (user.role === "admin") return { limit: null, used: scansUsedToday(user), remaining: null };
  const used = scansUsedToday(user);
  return { limit: DAILY_SCAN_LIMIT, used, remaining: Math.max(0, DAILY_SCAN_LIMIT - used) };
};

/**
 * Atomically claims one of today's scans. Returns false when the user has
 * already used their daily limit. Done before the (paid) AI analysis runs,
 * so two scans submitted at once can't both slip under the limit.
 */
export const reserveScan = async (user) => {
  const day = todayKey();
  const filter =
    user.role === "admin"
      ? { _id: user._id }
      : { _id: user._id, $or: [{ "scanQuota.day": { $ne: day } }, { "scanQuota.count": { $lt: DAILY_SCAN_LIMIT } }] };
  // Pipeline update: restart the count on a new day, otherwise add one.
  const res = await User.updateOne(filter, [
    {
      $set: {
        scanQuota: {
          day,
          count: { $cond: [{ $eq: ["$scanQuota.day", day] }, { $add: ["$scanQuota.count", 1] }, 1] },
        },
      },
    },
  ]);
  return res.modifiedCount === 1;
};

// Gives a reserved scan back when the analysis itself failed.
export const releaseScan = (user) =>
  User.updateOne({ _id: user._id, "scanQuota.day": todayKey(), "scanQuota.count": { $gt: 0 } }, { $inc: { "scanQuota.count": -1 } });
