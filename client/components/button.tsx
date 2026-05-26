import { type ReactNode } from "react";
import { Pressable, Text, type PressableProps, View } from "react-native";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Colors } from "@/constants/theme";

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
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const isPrimary = variant === "primary";

  const variantStyle = isPrimary
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
      }
    : {
        borderWidth: 1,
        borderColor: themeColors.borderDefault,
      };

  const variantClassName = isPrimary ? "bg-primary" : "bg-bg-elevated";

  return (
    <Pressable
      className={`rounded-control py-4 ${variantClassName} ${className}`}
      style={(state) => [variantStyle, typeof style === "function" ? style(state) : style]}
      {...props}
    >
      <View className="flex-row items-center justify-center gap-2">
        {leftIcon}
        <Text
          className={`font-semibold ${isPrimary ? "text-lg" : ""} ${textClassName}`}
          style={{ color: isPrimary ? "#FFFFFF" : themeColors.textPrimary }}
        >
          {label}
        </Text>
        {rightIcon}
      </View>
    </Pressable>
  );
}
