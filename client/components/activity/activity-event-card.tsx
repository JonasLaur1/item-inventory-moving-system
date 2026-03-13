import { Colors } from "@/constants/theme";
import { MetaPill } from "@/components/ui/meta-pill";
import type { ActivityType } from "@/lib/activity.service";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

export type ActivityEventType = ActivityType;

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  room: string;
  box?: string;
  occurredAt: string;
};

type ActivityEventCardProps = {
  event: ActivityEvent;
  timeLabel: string;
};

export function ActivityEventCard({ event, timeLabel }: ActivityEventCardProps) {
  const tone = getEventTone(event.type);

  return (
    <View className="rounded-card border border-border-default bg-bg-elevated/70 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row flex-1 items-start">
          <View className={`h-10 w-10 items-center justify-center rounded-full ${tone.iconBgClassName}`}>
            <Feather name={tone.icon} size={16} color={tone.iconColor} />
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-text-primary">{event.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-text-tertiary">{event.description}</Text>
          </View>
        </View>

        <View className={`rounded-full px-2.5 py-1 ${tone.badgeBgClassName}`}>
          <Text className={`text-[10px] font-semibold uppercase tracking-[0.7px] ${tone.badgeTextClassName}`}>
            {event.type}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <MetaPill icon="map-pin" text={event.room} />
        {event.box ? <MetaPill icon="archive" text={event.box} /> : null}
        <MetaPill icon="clock" text={timeLabel} />
      </View>
    </View>
  );
}

function getEventTone(type: ActivityEventType) {
  switch (type) {
    case "Packed":
      return {
        icon: "archive" as const,
        iconBgClassName: "bg-emerald/20",
        iconColor: Colors.dark.emerald,
        badgeBgClassName: "bg-emerald/20",
        badgeTextClassName: "text-emerald",
      };
    case "Moved":
      return {
        icon: "repeat" as const,
        iconBgClassName: "bg-primary/20",
        iconColor: Colors.dark.primary,
        badgeBgClassName: "bg-primary/20",
        badgeTextClassName: "text-text-link",
      };
    case "Created":
      return {
        icon: "plus-square" as const,
        iconBgClassName: "bg-primary/15",
        iconColor: Colors.dark.primary,
        badgeBgClassName: "bg-primary/15",
        badgeTextClassName: "text-text-link",
      };
    case "Updated":
      return {
        icon: "edit-3" as const,
        iconBgClassName: "bg-bg-input",
        iconColor: Colors.dark.textSecondary,
        badgeBgClassName: "bg-bg-input",
        badgeTextClassName: "text-text-secondary",
      };
    case "Deleted":
      return {
        icon: "trash-2" as const,
        iconBgClassName: "bg-crimson/20",
        iconColor: Colors.dark.crimson,
        badgeBgClassName: "bg-crimson/20",
        badgeTextClassName: "text-crimson",
      };
    default:
      return {
        icon: "clock" as const,
        iconBgClassName: "bg-bg-input",
        iconColor: Colors.dark.textSecondary,
        badgeBgClassName: "bg-bg-input",
        badgeTextClassName: "text-text-secondary",
      };
  }
}
