import { Colors } from "@/constants/theme";
import { type ReactNode } from "react";
import { Pressable, Text, type PressableProps, View } from "react-native";

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

type ButtonVariant = "primary" | "secondary";

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  textClassName?: string;
};

export function Button({
  label,
  variant = "primary",
  leftIcon,
  rightIcon,
  className = "",
  textClassName = "",
  style,
  ...props
}: ButtonProps) {
  const palette = Colors.dark;

  const containerStyle =
    variant === "primary"
      ? { backgroundColor: palette.textPrimary }
      : {
          backgroundColor: withAlpha(palette.bgElevated, 0.8),
          borderWidth: 1,
          borderColor: withAlpha(palette.textTertiary, 0.2),
        };

  const textColor = variant === "primary" ? palette.bgBase : palette.textPrimary;

  return (
    <Pressable
      className={`rounded-2xl py-4 ${className}`}
      style={typeof style === "function" ? style : [containerStyle, style]}
      {...props}
    >
      <View className="flex-row items-center justify-center gap-2">
        {leftIcon}
        <Text
          className={`font-semibold ${variant === "primary" ? "text-lg" : ""} ${textClassName}`}
          style={{ color: textColor }}
        >
          {label}
        </Text>
        {rightIcon}
      </View>
    </Pressable>
  );
}
