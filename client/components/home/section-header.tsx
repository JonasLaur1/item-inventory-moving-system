import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Colors } from "@/constants/theme";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onPressAction }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xl font-bold text-text-primary">{title}</Text>
      {actionLabel ? (
        onPressAction ? (
          <Pressable onPress={onPressAction} className="flex-row items-center gap-0.5" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text className="text-sm font-semibold text-text-link">{actionLabel}</Text>
            <Feather name="chevron-right" size={14} color={Colors.dark.textLink} />
          </Pressable>
        ) : (
          <Text className="text-sm font-semibold text-text-tertiary">{actionLabel}</Text>
        )
      ) : null}
    </View>
  );
}
