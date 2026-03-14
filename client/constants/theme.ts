import { Platform } from 'react-native';
import designTokens from './design-tokens.json';

const { brand, light, dark } = designTokens.colors;

const palettes = {
  light: {
    primary: brand.primary,
    crimson: brand.crimson,
    emerald: brand.emerald,
    bgBase: light.bgBase,
    bgElevated: light.bgElevated,
    bgInput: light.bgInput,
    bgDisabled: light.bgDisabled,
    borderDefault: light.borderDefault,
    borderSubtle: light.borderSubtle,
    borderStrong: light.borderStrong,
    textPrimary: light.textPrimary,
    textSecondary: light.textSecondary,
    textTertiary: light.textTertiary,
    textDisabled: light.textDisabled,
    textLink: light.textLink,
  },
  dark: {
    primary: brand.primary,
    crimson: brand.crimson,
    emerald: brand.emerald,
    bgBase: dark.bgBase,
    bgElevated: dark.bgElevated,
    bgInput: dark.bgInput,
    bgDisabled: dark.bgDisabled,
    borderDefault: dark.borderDefault,
    borderSubtle: dark.borderSubtle,
    borderStrong: dark.borderStrong,
    textPrimary: dark.textPrimary,
    textSecondary: dark.textSecondary,
    textTertiary: dark.textTertiary,
    textDisabled: dark.textDisabled,
    textLink: dark.textLink,
  },
};

export type AppThemeName = keyof typeof palettes;
export type ThemePalette = typeof palettes.light;

let activeTheme: AppThemeName = 'dark';

export function setActiveTheme(theme: AppThemeName) {
  activeTheme = theme;
}

export const ColorPalettes = palettes;

export const Colors = {
  light: palettes.light,
  get dark(): ThemePalette {
    return palettes[activeTheme];
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
