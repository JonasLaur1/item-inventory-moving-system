import { Colors } from "@/constants/theme";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

type Room = {
  id: string;
  name: string;
  packed: number;
  total: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type Activity = {
  id: string;
  item: string;
  detail: string;
  time: string;
  icon: keyof typeof Feather.glyphMap;
};

const roomData: Room[] = [
  { id: "kitchen", name: "Kitchen", packed: 12, total: 15, icon: "silverware-fork-knife" },
  { id: "living-room", name: "Living Room", packed: 8, total: 13, icon: "sofa" },
  { id: "master-bedroom", name: "Master Bedroom", packed: 6, total: 10, icon: "bed-king-outline" },
  { id: "garage", name: "Garage", packed: 4, total: 12, icon: "garage-variant" },
];

const recentActivity: Activity[] = [
  { id: "1", item: "Toaster", detail: "Added to Kitchen Box #3", time: "2m ago", icon: "archive" },
  { id: "2", item: "Winter Jacket", detail: "Moved to Master Bedroom Box #5", time: "15m ago", icon: "package" },
  { id: "3", item: "Photo Frame", detail: "Marked as fragile", time: "40m ago", icon: "alert-circle" },
  { id: "4", item: "Tool Set", detail: "Added to Garage Box #2", time: "1h ago", icon: "tool" },
];

export default function HomeTabScreen() {
  const [showAllRooms, setShowAllRooms] = useState(false);

  const totalBoxes = 40;
  const packedBoxes = 26;
  const percentage = Math.round((packedBoxes / totalBoxes) * 100);
  const boxesLeft = totalBoxes - packedBoxes;

  const progress = useMemo(() => {
    const radius = 88;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percentage / 100);

    return { radius, strokeWidth, circumference, offset };
  }, [percentage]);

  const visibleRooms = showAllRooms ? roomData : roomData.slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-card bg-primary/20">
                <Feather name="package" size={20} color={Colors.dark.primary} />
              </View>
              <Text className="text-2xl font-bold text-text-primary">BoxIt</Text>
            </View>
            <Pressable className="h-11 w-11 items-center justify-center rounded-card border border-border-default bg-bg-elevated/70">
              <Feather name="settings" size={18} color={Colors.dark.textPrimary} />
            </Pressable>
          </View>

          <View className="mt-8 items-center">
            <View className="relative h-[220px] w-[220px] items-center justify-center">
              <Svg width={220} height={220} viewBox="0 0 220 220">
                <Circle
                  cx={110}
                  cy={110}
                  r={progress.radius}
                  stroke={Colors.dark.borderDefault}
                  strokeWidth={progress.strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={110}
                  cy={110}
                  r={progress.radius}
                  stroke={Colors.dark.primary}
                  strokeWidth={progress.strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={progress.circumference}
                  strokeDashoffset={progress.offset}
                  transform="rotate(-90 110 110)"
                />
              </Svg>

              <View className="absolute items-center">
                <Text className="text-5xl font-black text-text-primary">{percentage}%</Text>
                <Text className="mt-1 text-xs uppercase tracking-[2px] text-text-tertiary">
                  Packed
                </Text>
                <Text className="mt-3 text-base font-bold text-text-primary">
                  {boxesLeft} Boxes Left
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-8 flex-row gap-3">
            <Pressable className="flex-1 rounded-card bg-primary px-4 py-5 shadow-soft">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
                <Feather name="camera" size={20} color={Colors.dark.textPrimary} />
              </View>
              <Text className="mt-4 text-lg font-bold text-text-primary">Scan QR</Text>
              <Text className="mt-1 text-sm text-text-secondary/80">Scan QR Code</Text>
            </Pressable>

            <Pressable className="flex-1 rounded-card border border-border-default bg-bg-elevated/70 px-4 py-5">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <Feather name="plus" size={20} color={Colors.dark.primary} />
              </View>
              <Text className="mt-4 text-lg font-bold text-text-primary">Add Box</Text>
              <Text className="mt-1 text-sm text-text-tertiary">Add New Box</Text>
            </Pressable>
          </View>

          <View className="mt-10">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-text-primary">Priority Rooms</Text>
              {roomData.length > 2 ? (
                <Pressable onPress={() => setShowAllRooms((prev) => !prev)}>
                  <Text className="text-sm font-semibold text-text-link">
                    {showAllRooms ? "Show Less" : "Show All"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mt-4 flex-row flex-wrap justify-between">
              {visibleRooms.map((room) => {
                const roomProgress = Math.round((room.packed / room.total) * 100);

                return (
                  <Pressable
                    key={room.id}
                    className="mb-3 rounded-card border border-border-default bg-bg-elevated/75 p-4"
                    style={{ width: "48.5%" }}
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-xl bg-primary/15">
                      <MaterialCommunityIcons
                        name={room.icon}
                        size={24}
                        color={Colors.dark.primary}
                      />
                    </View>
                    <Text className="mt-3 text-base font-bold text-text-primary">{room.name}</Text>
                    <Text className="mt-1 text-xs text-text-tertiary">
                      {room.packed}/{room.total} boxes
                    </Text>
                    <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
                      <View
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${roomProgress}%` }}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-xl font-bold text-text-primary">Recent Activity</Text>
            <View className="mt-4 gap-3">
              {recentActivity.slice(0, 4).map((activity) => (
                <View
                  key={activity.id}
                  className="flex-row items-center rounded-card border border-border-default bg-bg-elevated/70 p-4"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Feather name={activity.icon} size={16} color={Colors.dark.primary} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-text-primary">{activity.item}</Text>
                    <Text className="mt-1 text-xs text-text-link">{activity.detail}</Text>
                  </View>
                  <Text className="text-xs text-text-tertiary">{activity.time}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
