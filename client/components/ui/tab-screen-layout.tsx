import { type ReactNode } from "react";
import { type StyleProp, type ViewStyle, ScrollView, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { SafeAreaView } from "react-native-safe-area-context";

type TabScreenLayoutProps = {
  children: ReactNode;
  withHeader?: boolean;
  scrollable?: boolean;
  horizontalPadding?: number;
  paddingBottom?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function TabScreenLayout({
  children,
  withHeader = true,
  scrollable = true,
  horizontalPadding = 20,
  paddingBottom = 28,
  contentContainerStyle,
}: TabScreenLayoutProps) {
  const content = (
    <>
      {withHeader ? (
        <View className="pt-2">
          <AppHeader />
        </View>
      ) : null}
      {children}
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={[
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom,
            },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View
          className="flex-1"
          style={[
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom,
            },
            contentContainerStyle,
          ]}
        >
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}
