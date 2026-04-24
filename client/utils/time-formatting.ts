import i18n from "@/lib/i18n";

export function getMinutesAgo(occurredAt: string, nowMs: number): number {
  const timestamp = new Date(occurredAt).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.floor((nowMs - timestamp) / (60 * 1000)));
}

export function formatRelativeTime(minutesAgo: number): string {
  if (!Number.isFinite(minutesAgo) || minutesAgo < 0) {
    return i18n.t("common.unknown");
  }

  if (minutesAgo < 1) {
    return i18n.t("common.justNow");
  }

  if (minutesAgo < 60) {
    return i18n.t("time.minutesAgo", { count: minutesAgo });
  }

  if (minutesAgo < 24 * 60) {
    return i18n.t("time.hoursAgo", { count: Math.floor(minutesAgo / 60) });
  }

  return i18n.t("time.daysAgo", { count: Math.floor(minutesAgo / (24 * 60)) });
}
