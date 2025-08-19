/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Business-oriented color palette
        primary: {
          DEFAULT: "#1a365d",  // Dark blue
          foreground: "#f8fafc",
        },
        secondary: {
          DEFAULT: "#2c5282",  // Medium blue
          foreground: "#f8fafc",
        },
        accent: {
          DEFAULT: "#2b6cb0",  // Lighter blue
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#2f855a",  // Green
          foreground: "#f0fff4",
        },
        warning: {
          DEFAULT: "#b7791f",  // Amber
          foreground: "#fffaf0",
        },
        destructive: {
          DEFAULT: "#c53030",  // Red
          foreground: "#fff5f5",
        },
        muted: {
          DEFAULT: "#f1f5f9",  // Light gray
          foreground: "#475569",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1e293b",
        },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#1a365d",
        background: "#f8fafc",
        foreground: "#1e293b",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
