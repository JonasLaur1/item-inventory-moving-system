import type { InventoryBoxStatus } from "@/components/inventory/box-card";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

function getStatusStyle(status: InventoryBoxStatus): { bg: string; text: string } {
  switch (status) {
    case "Packed":
      return { bg: "bg-emerald/20", text: "text-emerald" };
    case "Delivered":
    case "Unpacked":
      return { bg: "bg-primary/20", text: "text-primary" };
    default:
      return { bg: "bg-crimson/20", text: "text-crimson" };
  }
}

function getStatusLabel(status: InventoryBoxStatus, t: (key: string) => string): string {
  switch (status) {
    case "Packed": return t("inventory.packed");
    case "Not packed": return t("inventory.notPacked");
    case "Delivered": return t("inventory.delivered");
    case "Unpacked": return t("inventory.unpacked");
    default: return status;
  }
}

type BoxStatusPillProps = {
  status: InventoryBoxStatus;
};

export function BoxStatusPill({ status }: BoxStatusPillProps) {
  const { t } = useTranslation();
  const style = getStatusStyle(status);
  return (
    <View className={`rounded-full px-3 py-1 ${style.bg}`}>
      <Text className={`text-xs font-semibold ${style.text}`}>{getStatusLabel(status, t)}</Text>
    </View>
  );
}
