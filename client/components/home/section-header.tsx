import { Pressable, Text, View } from "react-native";

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
          <Pressable onPress={onPressAction}>
            <Text className="text-sm font-semibold text-text-link">{actionLabel}</Text>
          </Pressable>
        ) : (
          <Text className="text-sm font-semibold text-text-tertiary">{actionLabel}</Text>
        )
      ) : null}
    </View>
  );
}
