import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

// Admin-controlled storefront switches (GET /api/settings). `shopEnabled`
// false = catalog only: products can be browsed but not bought. Until the
// first load it's treated as off, so buying UI never flashes up on a
// catalog-only site.
const SiteSettingsContext = createContext(null);

export const SiteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({ shopEnabled: false, quickScanFree: false, loaded: false });

  const refreshSettings = useCallback(
    () =>
      api
        .get("/settings")
        .then(({ data }) => setSettings({ ...data, loaded: true }))
        .catch(() => setSettings((prev) => ({ ...prev, loaded: true }))),
    []
  );

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return <SiteSettingsContext.Provider value={{ ...settings, refreshSettings }}>{children}</SiteSettingsContext.Provider>;
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
