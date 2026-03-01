import { Text, View } from "react-native";

type OverviewCardProps = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

export function OverviewCard({ label, value, fullWidth = false }: OverviewCardProps) {
  return (
    <View
      className="rounded-card border border-border-default bg-bg-elevated/70 px-4 py-4"
      style={{ width: fullWidth ? "100%" : "48.5%" }}
    >
      <Text className="text-xs uppercase tracking-[1.2px] text-text-tertiary">{label}</Text>
      <Text className="mt-2 text-2xl font-bold text-text-primary">{value}</Text>
    </View>
  );
}
