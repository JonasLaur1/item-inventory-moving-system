import { ColorPalettes } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TextInput, type TextInputProps, View } from "react-native";

type SearchBarProps = TextInputProps & {
  containerClassName?: string;
  inputClassName?: string;
};

export function SearchBar({
  containerClassName = "",
  inputClassName = "",
  placeholder,
  placeholderTextColor,
  selectionColor,
  ...props
}: SearchBarProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemePreference();
  const palette = ColorPalettes[resolvedTheme];

  return (
    <View
      className={`h-[48px] flex-row items-center rounded-control border border-border-strong bg-bg-input px-4 ${containerClassName}`}
    >
      <Feather name="search" size={16} color={palette.textSecondary} />
      <TextInput
        className={`ml-3 flex-1 text-sm ${inputClassName}`}
        style={{ color: palette.textPrimary }}
        placeholder={placeholder ?? t("common.search")}
        placeholderTextColor={placeholderTextColor ?? palette.textSecondary}
        selectionColor={selectionColor ?? palette.primary}
        {...props}
      />
    </View>
  );
}
