import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type FormInputProps = TextInputProps & {
  containerClassName?: string;
  inputClassName?: string;
  label?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightElement?: ReactNode;
  showDefaultBorder?: boolean;
};

export function FormInput({
  containerClassName = "",
  inputClassName = "",
  label,
  leftIcon,
  rightElement,
  showDefaultBorder = true,
  ...props
}: FormInputProps) {
  const palette = Colors.dark;
  const sharedInputProps = {
    placeholderTextColor: props.placeholderTextColor ?? palette.textTertiary,
    selectionColor: props.selectionColor ?? palette.primary,
    ...props,
  };

  return (
    <View className={`gap-2 ${containerClassName}`}>
      {label ? (
        <Text
          className="text-sm font-medium"
          style={{ color: palette.textSecondary }}
        >
          {label}
        </Text>
      ) : null}

      {leftIcon || rightElement ? (
        <View
          className="flex-row items-center rounded-2xl px-4"
          style={{
            backgroundColor: withAlpha(palette.bgElevated, 0.75),
            borderWidth: 1,
            borderColor: withAlpha(palette.textTertiary, 0.22),
            minHeight: 52,
          }}
        >
          {leftIcon ? (
            <Feather
              name={leftIcon}
              size={18}
              color={palette.textTertiary}
              style={{ marginRight: 10 }}
            />
          ) : null}

          <TextInput
            className={`flex-1 text-base ${inputClassName}`}
            style={[{ color: palette.textPrimary, paddingVertical: 12 }, props.style]}
            {...sharedInputProps}
          />

          {rightElement}
        </View>
      ) : (
        <TextInput
          className={`w-full rounded-2xl px-4 py-3 text-base ${showDefaultBorder ? "border border-gray-300" : ""} ${inputClassName}`}
          style={[{ color: palette.textPrimary }, props.style]}
          {...sharedInputProps}
        />
      )}
    </View>
  );
}
