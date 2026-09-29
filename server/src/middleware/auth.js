import jwt from "jsonwebtoken";
import User from "../models/User.js";

const UNVERIFIED_ALLOWED = new Set(["/api/auth/me", "/api/auth/verify-email", "/api/auth/resend-code"]);

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized. Please log in." });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User no longer exists." });
    // Until the email code is entered, only the account itself and the
    // verify/resend endpoints are reachable.
    if (user.emailVerified === false && !UNVERIFIED_ALLOWED.has(req.originalUrl.split("?")[0])) {
      return res.status(403).json({ code: "EMAIL_NOT_VERIFIED", message: "Please verify your email to continue." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
};
