import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

type MetaPillProps = {
  icon: keyof typeof Feather.glyphMap;
  text: string;
};

export function MetaPill({ icon, text }: MetaPillProps) {
  return (
    <View className="flex-row items-center rounded-full border border-border-default bg-bg-input/60 px-3 py-1.5">
      <Feather name={icon} size={12} color={Colors.dark.textTertiary} />
      <Text className="ml-1.5 text-xs text-text-tertiary">{text}</Text>
    </View>
  );
}
