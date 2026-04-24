import { Colors } from "@/constants/theme";
import type { ActivityType } from "@/lib/activity.service";
import i18n from "@/lib/i18n";

export type EventTone = {
  icon: "archive" | "repeat" | "plus-square" | "edit-3" | "trash-2" | "truck" | "clock";
  iconBgClassName: string;
  iconColor: string;
  badgeBgClassName: string;
  badgeTextClassName: string;
};

type ActivityTextSource = {
  type: ActivityType;
  entityType: string;
  title: string;
  location: string;
  room?: string;
  box?: string;
};

export function getTranslatedActivityText(event: ActivityTextSource): { title: string; description: string } {
  const entity = event.entityType.charAt(0).toUpperCase() + event.entityType.slice(1);
  const titleKey = `activity.title${entity}${event.type}`;
  const title = i18n.exists(titleKey) ? i18n.t(titleKey) : event.title;

  let description: string;
  if (event.entityType === "item" && event.box) {
    description = i18n.t("activity.descInBox", { box: event.box });
  } else if (event.room) {
    description = i18n.t("activity.descInRoom", { room: event.room });
  } else {
    description = i18n.t("activity.descInLocation", { location: event.location });
  }

  return { title, description };
}

export function getEventDisplayLabel(type: ActivityType): string {
  switch (type) {
    case "Created": return i18n.t("activity.created");
    case "Updated": return i18n.t("activity.updated");
    case "Moved": return i18n.t("activity.moved");
    case "Deleted": return i18n.t("activity.deleted");
    case "Packed": return i18n.t("activity.packedFilter");
    case "Delivered": return i18n.t("activity.deliveredFilter");
    default: return type;
  }
}

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
