import { Colors } from "@/constants/theme";
import type { ActivityType } from "@/lib/activity.service";

export type EventTone = {
  icon: "archive" | "repeat" | "plus-square" | "edit-3" | "trash-2" | "truck" | "clock";
  iconBgClassName: string;
  iconColor: string;
  badgeBgClassName: string;
  badgeTextClassName: string;
};

export const EVENT_DISPLAY_LABEL: Partial<Record<ActivityType, string>> = {
  Created: "Created",
  Updated: "Updated",
  Moved: "Moved",
  Deleted: "Deleted",
  Packed: "Packed",
  Delivered: "Delivered",
};

export function getEventTone(type: ActivityType): EventTone {
  switch (type) {
    case "Packed":
      return {
        icon: "archive",
        iconBgClassName: "bg-emerald/20",
        iconColor: Colors.dark.emerald,
        badgeBgClassName: "bg-emerald/20",
        badgeTextClassName: "text-emerald",
      };
    case "Moved":
      return {
        icon: "repeat",
        iconBgClassName: "bg-primary/20",
        iconColor: Colors.dark.primary,
        badgeBgClassName: "bg-primary/20",
        badgeTextClassName: "text-text-link",
      };
    case "Created":
      return {
        icon: "plus-square",
        iconBgClassName: "bg-primary/15",
        iconColor: Colors.dark.primary,
        badgeBgClassName: "bg-primary/15",
        badgeTextClassName: "text-text-link",
      };
    case "Updated":
      return {
        icon: "edit-3",
        iconBgClassName: "bg-bg-input",
        iconColor: Colors.dark.textSecondary,
        badgeBgClassName: "bg-bg-input",
        badgeTextClassName: "text-text-secondary",
      };
    case "Deleted":
      return {
        icon: "trash-2",
        iconBgClassName: "bg-crimson/20",
        iconColor: Colors.dark.crimson,
        badgeBgClassName: "bg-crimson/20",
        badgeTextClassName: "text-crimson",
      };
    case "Delivered":
      return {
        icon: "truck",
        iconBgClassName: "bg-emerald/20",
        iconColor: Colors.dark.emerald,
        badgeBgClassName: "bg-emerald/20",
        badgeTextClassName: "text-emerald",
      };
    default:
      return {
        icon: "clock",
        iconBgClassName: "bg-bg-input",
        iconColor: Colors.dark.textSecondary,
        badgeBgClassName: "bg-bg-input",
        badgeTextClassName: "text-text-secondary",
      };
  }
}
