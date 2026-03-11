import { MaterialCommunityIcons } from "@expo/vector-icons";

export type LocationIcon = keyof typeof MaterialCommunityIcons.glyphMap;

const LOCATION_ICONS: LocationIcon[] = [
  "silverware-fork-knife",
  "sofa-outline",
  "bed-king-outline",
  "garage-variant",
  "desk",
  "bathtub-outline",
  "door-sliding",
  "toolbox-outline",
  "archive-outline",
  "bookshelf",
];

function toStableIndex(value: string, length: number): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) % length;
}

export function getLocationIcon(locationName: string): LocationIcon {
  const normalizedName = locationName.trim().toLowerCase();

  if (normalizedName.includes("kitchen")) return "silverware-fork-knife";
  if (normalizedName.includes("living")) return "sofa-outline";
  if (normalizedName.includes("bed")) return "bed-king-outline";
  if (normalizedName.includes("garage")) return "garage-variant";
  if (normalizedName.includes("bath")) return "bathtub-outline";
  if (normalizedName.includes("office")) return "desk";

  return LOCATION_ICONS[toStableIndex(normalizedName, LOCATION_ICONS.length)];
}
