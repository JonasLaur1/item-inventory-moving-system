/** @type {import('tailwindcss').Config} */
const designTokens = require("./constants/design-tokens.json");

const { brand } = designTokens.colors;

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: brand.primary,
        crimson: brand.crimson,
        emerald: brand.emerald,
        "bg-base": "rgb(var(--color-bg-base) / <alpha-value>)",
        "bg-elevated": "rgb(var(--color-bg-elevated) / <alpha-value>)",
        "bg-input": "rgb(var(--color-bg-input) / <alpha-value>)",
        "bg-disabled": "rgb(var(--color-bg-disabled) / <alpha-value>)",
        "border-default": "rgb(var(--color-border-default) / <alpha-value>)",
        "border-subtle": "rgb(var(--color-border-subtle) / <alpha-value>)",
        "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        "text-tertiary": "rgb(var(--color-text-tertiary) / <alpha-value>)",
        "text-disabled": "rgb(var(--color-text-disabled) / <alpha-value>)",
        "text-link": "rgb(var(--color-text-link) / <alpha-value>)",
      },
      borderRadius: {
        control: designTokens.radius.control,
        card: designTokens.radius.card,
        modal: designTokens.radius.modal,
      },
      spacing: {
        18: designTokens.spacing["18"],
        22: designTokens.spacing["22"],
        26: designTokens.spacing["26"],
        30: designTokens.spacing["30"],
      },
      boxShadow: {
        card: designTokens.shadow.card,
        modal: designTokens.shadow.modal,
        soft: designTokens.shadow.soft,
      },
    },
  },
  plugins: [],
};
