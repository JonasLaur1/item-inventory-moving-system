import { CollaboratorPill } from "@/components/ui/collaborator-pill";
import { MetaPill } from "@/components/ui/meta-pill";
import { useThemePreference } from "@/hooks/use-theme-preference";
import type { ActivityType } from "@/lib/activity.service";
import { getEventDisplayLabel, getEventTone, getTranslatedActivityText } from "@/utils/activity-tone";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

export type ActivityEventType = ActivityType;

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  entityType: string;
  title: string;
  description: string;
  location: string;
  room?: string;
  box?: string;
  occurredAt: string;
  actorName?: string | null;
  isOwnEvent?: boolean;
};

type ActivityEventCardProps = {
  event: ActivityEvent;
  timeLabel: string;
};

export function ActivityEventCard({ event, timeLabel }: ActivityEventCardProps) {
  const { resolvedTheme } = useThemePreference();
  const tone = getEventTone(event.type);
  const isCollaborator = !event.isOwnEvent;
  const iconColor = resolvedTheme === "dark" ? tone.iconColor : tone.iconColor;
  const { title, description } = getTranslatedActivityText(event);

  return (
    <View
      className="rounded-card border border-border-default bg-bg-elevated/70 p-4"
      style={isCollaborator ? { borderLeftColor: "#2D6EF0", borderLeftWidth: 3 } : undefined}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-start">
          <View className={`h-10 w-10 items-center justify-center rounded-full ${tone.iconBgClassName}`}>
            <Feather name={tone.icon} size={16} color={iconColor} />
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-text-primary">{title}</Text>
            <Text className="mt-1 text-xs leading-5 text-text-tertiary">{description}</Text>
          </View>
        </View>

        <View className={`rounded-full px-2.5 py-1 ${tone.badgeBgClassName}`}>
          <Text className={`text-[10px] font-semibold uppercase tracking-[0.7px] ${tone.badgeTextClassName}`}>
            {getEventDisplayLabel(event.type)}
          </Text>
        </View>
      </View>

      <View className="mt-3 border-t border-border-subtle pt-3 flex-row flex-wrap gap-2">
        <MetaPill icon="map-pin" text={event.location} />
        {event.room ? <MetaPill icon="home" text={event.room} /> : null}
        {event.box ? <MetaPill icon="archive" text={event.box} /> : null}
        <MetaPill icon="clock" text={timeLabel} />
        {isCollaborator ? <CollaboratorPill actorName={event.actorName} /> : null}
      </View>
    </View>
  );
}
