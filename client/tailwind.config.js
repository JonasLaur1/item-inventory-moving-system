/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary Brand & Status Colors
        primary: "#2E6FF2",
        crimson: "#EF4444",
        emerald: "#10B981",
        
        // Background & Surface
        "bg-base": "#121826",
        "bg-elevated": "#1C2433",
        "bg-input": "#2D3748",
        
        // Typography & Icons
        "text-primary": "#FFFFFF",
        "text-secondary": "#E2E8F0",
        "text-tertiary": "#94A3B8",
        "text-disabled": "#4A5568",
      },
    },
  },
  plugins: [],
}

