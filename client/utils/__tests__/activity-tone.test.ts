import { Colors } from "@/constants/theme";
import { EVENT_DISPLAY_LABEL, getEventTone } from "@/utils/activity-tone";

describe("EVENT_DISPLAY_LABEL", () => {
  it("has entries for all expected activity types", () => {
    expect(EVENT_DISPLAY_LABEL).toMatchObject({
      Created: "Created",
      Updated: "Updated",
      Moved: "Moved",
      Deleted: "Deleted",
      Packed: "Packed",
      Delivered: "Delivered",
    });
  });

  it("has exactly 6 keys", () => {
    expect(Object.keys(EVENT_DISPLAY_LABEL)).toHaveLength(6);
  });
});

describe("getEventTone", () => {
  it("returns correct tone for Packed", () => {
    const tone = getEventTone("Packed");
    expect(tone.icon).toBe("archive");
    expect(tone.iconColor).toBe(Colors.dark.emerald);
    expect(tone.iconBgClassName).toBe("bg-emerald/20");
    expect(tone.badgeBgClassName).toBe("bg-emerald/20");
    expect(tone.badgeTextClassName).toBe("text-emerald");
  });

  it("returns correct tone for Moved", () => {
    const tone = getEventTone("Moved");
    expect(tone.icon).toBe("repeat");
    expect(tone.iconColor).toBe(Colors.dark.primary);
    expect(tone.badgeTextClassName).toBe("text-text-link");
  });

  it("returns correct tone for Created", () => {
    const tone = getEventTone("Created");
    expect(tone.icon).toBe("plus-square");
    expect(tone.iconColor).toBe(Colors.dark.primary);
    expect(tone.iconBgClassName).toBe("bg-primary/15");
    expect(tone.badgeTextClassName).toBe("text-text-link");
  });

  it("returns correct tone for Updated", () => {
    const tone = getEventTone("Updated");
    expect(tone.icon).toBe("edit-3");
    expect(tone.iconColor).toBe(Colors.dark.textSecondary);
    expect(tone.iconBgClassName).toBe("bg-bg-input");
    expect(tone.badgeTextClassName).toBe("text-text-secondary");
  });

  it("returns correct tone for Deleted", () => {
    const tone = getEventTone("Deleted");
    expect(tone.icon).toBe("trash-2");
    expect(tone.iconColor).toBe(Colors.dark.crimson);
    expect(tone.iconBgClassName).toBe("bg-crimson/20");
    expect(tone.badgeTextClassName).toBe("text-crimson");
  });

  it("returns correct tone for Delivered", () => {
    const tone = getEventTone("Delivered");
    expect(tone.icon).toBe("truck");
    expect(tone.iconColor).toBe(Colors.dark.emerald);
    expect(tone.badgeBgClassName).toBe("bg-emerald/20");
    expect(tone.badgeTextClassName).toBe("text-emerald");
  });

  it("returns clock fallback for unknown type via cast", () => {
    const tone = getEventTone("Unknown" as never);
    expect(tone.icon).toBe("clock");
    expect(tone.iconBgClassName).toBe("bg-bg-input");
    expect(tone.badgeTextClassName).toBe("text-text-secondary");
  });
});
