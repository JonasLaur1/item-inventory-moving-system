import { TabScreenLayout } from "@/components/ui/tab-screen-layout";
import { Text, View } from "react-native";

export default function ActivityTabScreen() {
  return (
    <TabScreenLayout withHeader={false} scrollable={false} horizontalPadding={20} paddingBottom={0}>
      <View className="flex-1 pt-6">
        <Text className="text-3xl font-bold text-text-primary">Activity</Text>
        <Text className="mt-2 text-sm text-text-tertiary">
          Review your latest box and item changes.
        </Text>
      </View>
    </TabScreenLayout>
  );
}
