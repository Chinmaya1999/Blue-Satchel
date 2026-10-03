import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "./Loader.jsx";
import { canAfford, buyCreditsPath, minScanCost } from "../utils/credits.js";
import { usePricing } from "../context/PricingContext.jsx";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";

export const verifyEmailPath = (next) => `/verify-email${next ? `?next=${encodeURIComponent(next)}` : ""}`;

// Signed-in pages. An account that hasn't entered its email code yet is sent
// to /verify-email first (unless `allowUnverified`, used by that page itself).
export const ProtectedRoute = ({ children, allowUnverified = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="fs-page fs-page-bg"><Loader full label="Loading your session…" /></div>;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.emailVerified === false && !allowUnverified) return <Navigate to={verifyEmailPath(location.pathname)} replace />;
  return children;
};

// Only lets the page render when the user's credits cover the scan's current
// cost (`mode`, or "any" for the cheapest scan); otherwise — including
// someone typing the URL directly — sends them to Buy Credits and brings them
// back here after purchase. A free scan (cost 0) is always allowed. Use
// inside ProtectedRoute. The server charges and enforces credits on its own too.
export const CreditRoute = ({ mode, children }) => {
  const { user } = useAuth();
  const { costs } = usePricing();
  const location = useLocation();

  if (!costs) return <div className="fs-page fs-page-bg"><Loader full label="Loading…" /></div>;
  const cost = mode === "any" ? minScanCost(costs) : costs[mode];
  if (!canAfford(user, cost)) return <Navigate to={buyCreditsPath(cost, location.pathname)} replace />;
  return children;
};

// Checkout / orders pages: only while the admin has shop sales switched on.
// Otherwise (catalog-only mode) send people back to browse the shop.
export const ShopRoute = ({ children }) => {
  const { shopEnabled, loaded } = useSiteSettings();
  if (!loaded) return <div className="fs-page fs-page-bg"><Loader full label="Loading…" /></div>;
  if (!shopEnabled) return <Navigate to="/shop" replace />;
  return children;
};

// A scan page only opens while the admin has that service switched on.
export const ServiceRoute = ({ mode, children }) => {
  const settings = useSiteSettings();
  if (!settings.loaded) return <div className="fs-page fs-page-bg"><Loader full label="Loading…" /></div>;
  if (settings[`${mode}ScanEnabled`] === false) return <Navigate to="/scan" replace />;
  return children;
};

export const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader full label="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified === false) return <Navigate to={verifyEmailPath("/admin")} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};

// Salon owners' dashboard (admins may look in too).
export const SalonRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader full label="Loading…" />;
  if (!user) return <Navigate to="/login?redirect=/salon" replace />;
  if (user.emailVerified === false) return <Navigate to={verifyEmailPath("/salon")} replace />;
  if (user.role !== "salon") return <Navigate to="/" replace />;
  return children;
};
