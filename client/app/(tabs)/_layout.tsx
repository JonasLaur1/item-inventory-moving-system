import { ColorPalettes } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { resolvedTheme } = useThemePreference();
  const palette = ColorPalettes[resolvedTheme];
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.textLink,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: palette.bgElevated,
          borderTopColor: palette.borderDefault,
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          overflow: "visible",
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Feather name="home" size={18} color={color} />,
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => <Feather name="archive" size={18} color={color} />,
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                height: 54,
                width: 54,
                borderRadius: 27,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -26,
                backgroundColor: focused ? palette.primary : `${palette.primary}D1`,
                borderWidth: 2,
                borderColor: palette.bgElevated,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              <Feather name="camera" size={20} color={palette.textPrimary} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="rooms"
        options={{
          title: "Rooms",
          tabBarIcon: ({ color }) => <Feather name="grid" size={18} color={color} />,
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color }) => <Feather name="clock" size={18} color={color} />,
        }}
      />
    </Tabs>
  );
}
