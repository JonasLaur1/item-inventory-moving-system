import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function ActivityTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-5 pt-6">
        <Text className="text-3xl font-bold text-text-primary">Activity</Text>
        <Text className="mt-2 text-sm text-text-tertiary">
          Review your latest box and item changes.
        </Text>
      </View>
    </SafeAreaView>
  );
}
