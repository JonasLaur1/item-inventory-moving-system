import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function InventoryTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-5 pt-6">
        <Text className="text-3xl font-bold text-text-primary">Inventory</Text>
        <Text className="mt-2 text-sm text-text-tertiary">
          Manage all your boxes and items in one place.
        </Text>
      </View>
    </SafeAreaView>
  );
}
