import { Text, View } from "react-native";

type FragilityBadgeProps = {
  isFragile: boolean;
};

export function FragilityBadge({ isFragile }: FragilityBadgeProps) {
  return (
    <View className={`rounded-full px-3 py-1 ${isFragile ? "bg-amber-500/20" : "bg-slate-500/20"}`}>
      <Text className={`text-xs font-semibold ${isFragile ? "text-amber-300" : "text-slate-300"}`}>
        {isFragile ? "Fragile" : "Not fragile"}
      </Text>
    </View>
  );
}
