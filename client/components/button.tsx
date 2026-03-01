import { type ReactNode } from "react";
import { Pressable, Text, type PressableProps, View } from "react-native";

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
  const containerClassName =
    variant === "primary"
      ? "bg-text-primary"
      : "bg-bg-elevated/80 border border-border-default";
  const textColorClassName =
    variant === "primary" ? "text-bg-base text-lg" : "text-text-primary";

  return (
    <Pressable
      className={`rounded-control py-4 ${containerClassName} ${className}`}
      style={style}
      {...props}
    >
      <View className="flex-row items-center justify-center gap-2">
        {leftIcon}
        <Text className={`font-semibold ${textColorClassName} ${textClassName}`}>
          {label}
        </Text>
        {rightIcon}
      </View>
    </Pressable>
  );
}
