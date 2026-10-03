import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

const read = () => {
  try {
    return localStorage.getItem("bs_theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

// "dark" is the site's original look; "light" switches the whole site via
// <html data-theme="light"> (see the light-theme block in index.css).
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f8fc" : "#050814");
    try {
      localStorage.setItem("bs_theme", theme);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
