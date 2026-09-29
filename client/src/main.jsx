import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { PricingProvider } from "./context/PricingContext.jsx";
import { SiteSettingsProvider } from "./context/SiteSettingsContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteSettingsProvider>
          <PricingProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </PricingProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
