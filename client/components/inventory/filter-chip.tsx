import { Pressable, Text } from "react-native";

type FilterChipProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

export function FilterChip({ label, isActive, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        isActive ? "border-primary bg-primary/20" : "border-border-default bg-bg-elevated/60"
      }`}
    >
      <Text className={`text-xs font-semibold ${isActive ? "text-text-primary" : "text-text-tertiary"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
