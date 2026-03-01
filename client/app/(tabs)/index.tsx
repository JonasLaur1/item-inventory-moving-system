import { Colors } from "@/constants/theme";
import {
  PriorityRoomCard,
  type PriorityRoomCardProps,
} from "@/components/home/priority-room-card";
import { QuickActionCard } from "@/components/home/quick-action-card";
import { SectionHeader } from "@/components/home/section-header";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

type Room = {
  id: string;
  name: string;
  packed: number;
  total: number;
  icon: PriorityRoomCardProps["icon"];
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
            <QuickActionCard
              title="Scan QR"
              subtitle="Scan QR Code"
              icon="camera"
              variant="primary"
            />
            <QuickActionCard
              title="Add Box"
              subtitle="Add New Box"
              icon="plus"
              variant="secondary"
            />
          </View>

          <View className="mt-10">
            <SectionHeader
              title="Priority Rooms"
              actionLabel={roomData.length > 2 ? (showAllRooms ? "Show Less" : "Show All") : undefined}
              onPressAction={
                roomData.length > 2 ? () => setShowAllRooms((prev) => !prev) : undefined
              }
            />

            <View className="mt-4 flex-row flex-wrap justify-between">
              {visibleRooms.map((room) => (
                <PriorityRoomCard
                  key={room.id}
                  name={room.name}
                  packed={room.packed}
                  total={room.total}
                  icon={room.icon}
                  style={{ width: "48.5%" }}
                />
              ))}
            </View>
          </View>

          <View className="mt-4">
            <SectionHeader title="Recent Activity" />
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
