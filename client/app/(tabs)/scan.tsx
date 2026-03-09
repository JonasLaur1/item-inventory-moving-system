import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Text, View } from "react-native";

export default function ScanTabScreen() {
  return (
    <TabScreenLayout withHeader={false} scrollable={false} horizontalPadding={20} paddingBottom={0}>
      <View className="flex-1 pt-6">
        <Text className="text-3xl font-bold text-text-primary">Scan</Text>
        <Text className="mt-2 text-sm text-text-tertiary">
          Scan QR codes to quickly assign or find boxes.
        </Text>
      </View>
    </TabScreenLayout>
  );
}
