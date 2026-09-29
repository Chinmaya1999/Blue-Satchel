import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";
import { DEFAULT_SCAN_COSTS } from "../utils/credits.js";

// Current scan costs, credit plans and payment config from the server. Scan
// costs can change at runtime (admins can make Quick Scan free), so pages
// read them from here rather than a hard-coded constant.
const PricingContext = createContext(null);

export const PricingProvider = ({ children }) => {
  const [pricing, setPricing] = useState(null); // { plans, costs, payment }

  const refreshPricing = useCallback(
    () =>
      api
        .get("/credits/plans")
        .then(({ data }) => {
          setPricing(data);
          return data;
        })
        // Keep the site usable if this fails; the server still enforces costs.
        .catch(() => setPricing((prev) => prev || { plans: [], costs: DEFAULT_SCAN_COSTS, payment: null })),
    []
  );

  useEffect(() => {
    refreshPricing();
  }, [refreshPricing]);

  return (
    <PricingContext.Provider value={{ pricing, costs: pricing?.costs, refreshPricing }}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => useContext(PricingContext);
