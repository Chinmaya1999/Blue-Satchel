import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { LocaleProvider } from "./context/LocaleContext.jsx";
import { PricingProvider } from "./context/PricingContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SiteSettingsProvider } from "./context/SiteSettingsContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <SiteSettingsProvider>
          <PricingProvider>
            <LocaleProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </LocaleProvider>
          </PricingProvider>
        </SiteSettingsProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
