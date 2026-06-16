import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#040810",
          900: "#0a0f1e",
          800: "#0d1529",
          700: "#111d35",
          600: "#162240",
        },
        cyan: {
          glow: "#00d4ff",
          dim: "#00a8cc",
          faint: "#00d4ff22",
        },
        risk: {
          low: "#00e676",
          moderate: "#ffab40",
          high: "#ff5252",
        },
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        body: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "grid-navy": "radial-gradient(circle, #00d4ff15 1px, transparent 1px)",
        "glow-cyan": "radial-gradient(ellipse at center, #00d4ff33 0%, transparent 70%)",
      },
      backgroundSize: {
        "grid-sm": "32px 32px",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "gauge-fill": "gaugeFill 1.2s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px #00d4ff44" },
          "50%": { boxShadow: "0 0 40px #00d4ff88" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gaugeFill: {
          from: { strokeDashoffset: "251" },
          to: {},
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        glass: "0 4px 30px rgba(0, 0, 0, 0.4)",
        "cyan-glow": "0 0 30px #00d4ff44",
        "risk-low": "0 0 20px #00e67644",
        "risk-moderate": "0 0 20px #ffab4044",
        "risk-high": "0 0 20px #ff525244",
      },
    },
  },
  plugins: [],
};

export default config;
