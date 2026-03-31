import { type InventoryItemRowData } from "@/components/inventory/item-row";
import { type BoxDetailsItem } from "@/lib/box.service";
import { formatRelativeTime, getMinutesAgo } from "@/utils/time-formatting";

export type EditableStatus = "packed" | "unpacked";

export const editableStatuses: { label: string; value: EditableStatus }[] = [
  { label: "Packed", value: "packed" },
  { label: "Not packed", value: "unpacked" },
];

export function formatUpdatedAt(isoDate: string | null): string {
  if (!isoDate) {
    return "Unknown";
  }

  return formatRelativeTime(getMinutesAgo(isoDate, Date.now()));
}

export function formatStatusLabel(status: string): string {
  switch (status) {
    case "packed":
      return "Packed";
    case "delivered":
      return "Delivered";
    case "unpacked_at_destination":
      return "Unpacked";
    default:
      return "Not packed";
  }
}

export function clampToEditableStatus(status: string): EditableStatus {
  return status === "packed" ? "packed" : "unpacked";
}

export function parseQuantity(value: string): number | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
}

export function mapItemToRow(item: BoxDetailsItem): InventoryItemRowData {
  return {
    id: item.id,
    title: item.name,
    subtitle: item.notes?.trim() ? item.notes : undefined,
    quantity: item.quantity,
    isFragile: item.isFragile,
    icon: "package",
    photoUrl: item.photoUrl,
  };
}
