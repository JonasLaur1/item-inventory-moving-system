import { type StyleProp, Text, type ViewStyle, View } from "react-native";

type MetricCardVariant = "default" | "success" | "warning" | "danger";

const variantValueClass: Record<MetricCardVariant, string> = {
  default: "text-text-primary",
  success: "text-emerald",
  warning: "text-amber-300",
  danger: "text-crimson",
};

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  progress?: number;
  variant?: MetricCardVariant;
  className?: string;
  valueClassName?: string;
  style?: StyleProp<ViewStyle>;
};

export function MetricCard({
  label,
  value,
  hint,
  progress,
  variant = "default",
  className = "",
  valueClassName,
  style,
}: MetricCardProps) {
  const resolvedValueClass = valueClassName ?? `text-2xl font-bold ${variantValueClass[variant]}`;

  return (
    <View
      className={`rounded-card border border-border-default bg-bg-elevated/70 p-4 ${className}`}
      style={style}
    >
      <Text className="text-xs uppercase tracking-[1.2px] text-text-tertiary">{label}</Text>
      <Text className={`mt-2 ${resolvedValueClass}`}>{value}</Text>
      {hint ? <Text className="mt-1 text-xs text-text-tertiary">{hint}</Text> : null}
      {typeof progress === "number" ? (
        <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </View>
      ) : null}
    </View>
  );
}
