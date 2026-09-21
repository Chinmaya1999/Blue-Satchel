/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b9d1ff",
          300: "#8fb3ff",
          400: "#5c8dff",
          500: "#3366ff",
          600: "#2148db",
          700: "#1a37ab",
          800: "#152c86",
          900: "#0f2064",
          950: "#0a1543",
        },
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(15,32,100,0.25)",
        card: "0 2px 10px -2px rgba(15,32,100,0.08)",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0f2064 0%, #1a37ab 45%, #3366ff 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
