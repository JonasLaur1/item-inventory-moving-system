import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function ScanTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-5 pt-6">
        <Text className="text-3xl font-bold text-text-primary">Scan</Text>
        <Text className="mt-2 text-sm text-text-tertiary">
          Scan QR codes to quickly assign or find boxes.
        </Text>
      </View>
    </SafeAreaView>
  );
}
