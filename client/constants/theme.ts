import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: "#2E6FF2",
    crimson: "#EF4444",
    emerald: "#10B981",
    bgBase: "#F8FAFC",
    bgElevated: "#FFFFFF",
    bgInput: "#E2E8F0",
    textPrimary: "#0F172A",
    textSecondary: "#1E293B",
    textTertiary: "#64748B",
    textDisabled: "#CBD5E1",
  },
  dark: {
    primary: "#2E6FF2",
    crimson: "#EF4444",
    emerald: "#10B981",
    bgBase: "#121826",
    bgElevated: "#1C2433",
    bgInput: "#2D3748",
    textPrimary: "#FFFFFF",
    textSecondary: "#E2E8F0",
    textTertiary: "#94A3B8",
    textDisabled: "#4A5568",
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
