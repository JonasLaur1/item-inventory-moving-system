/** @type {import('tailwindcss').Config} */
const designTokens = require("./constants/design-tokens.json");

const { brand, dark } = designTokens.colors;

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
        "bg-base": dark.bgBase,
        "bg-elevated": dark.bgElevated,
        "bg-input": dark.bgInput,
        "bg-disabled": dark.bgDisabled,
        "border-default": dark.borderDefault,
        "border-subtle": dark.borderSubtle,
        "border-strong": dark.borderStrong,
        "text-primary": dark.textPrimary,
        "text-secondary": dark.textSecondary,
        "text-tertiary": dark.textTertiary,
        "text-disabled": dark.textDisabled,
        "text-link": dark.textLink,
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
