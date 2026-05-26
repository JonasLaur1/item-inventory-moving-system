import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/button";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

type StatRowProps = {
  label: string;
  value: number;
  warn?: boolean;
  isLast?: boolean;
  themeColors: (typeof Colors)[keyof typeof Colors];
};

function StatRow({ label, value, warn = false, isLast = false, themeColors }: StatRowProps) {
  const highlighted = warn && value > 0;
  return (
    <View className={`flex-row items-center justify-between py-2.5 ${!isLast ? "border-b border-border-default" : ""}`}>
      <Text className="text-sm text-text-secondary">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {highlighted ? (
          <Feather name="alert-circle" size={13} color={themeColors.crimson} />
        ) : null}
        <Text className={`text-sm font-semibold ${highlighted ? "text-crimson" : "text-text-primary"}`}>
          {value}
        </Text>
      </View>
    </View>
  );
}

type Props = {
  visible: boolean;
  fromLocationName: string | null;
  toLocationName: string | null;
  totalBoxes: number;
  deliveredBoxes: number;
  unpackedBoxes: number;
  totalItems: number;
  uncheckedItems: number;
  isLoadingStats: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function MoveSummaryModal({
  visible,
  fromLocationName,
  toLocationName,
  totalBoxes,
  deliveredBoxes,
  unpackedBoxes,
  totalItems,
  uncheckedItems,
  isLoadingStats,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];
  const notDeliveredBoxes = totalBoxes - deliveredBoxes;

  const description =
    fromLocationName && toLocationName
      ? `${fromLocationName} → ${toLocationName}`
      : t("modals.moveSummaryFallback");

  return (
    <AppModal
      visible={visible}
      title={t("modals.moveSummaryTitle")}
      description={description}
      onRequestClose={onClose}
      maxWidth={420}
    >
      {isLoadingStats ? (
        <View className="items-center py-6">
          <ActivityIndicator />
        </View>
      ) : (
        <View className="gap-4">
          <View>
            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {t("inventory.boxesSection")}
            </Text>
            <View className="rounded-card border border-border-default bg-bg-elevated/60 px-3">
              <StatRow label={t("modals.totalBoxes")} value={totalBoxes} themeColors={themeColors} />
              <StatRow label={t("modals.deliveredBoxes")} value={deliveredBoxes} themeColors={themeColors} />
              <StatRow label={t("modals.fullyUnpacked")} value={unpackedBoxes} themeColors={themeColors} />
              <StatRow label={t("modals.notDelivered")} value={notDeliveredBoxes} warn isLast themeColors={themeColors} />
            </View>
          </View>

          {totalItems > 0 ? (
            <View>
              <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {t("inventory.itemsSection")}
              </Text>
              <View className="rounded-card border border-border-default bg-bg-elevated/60 px-3">
                <StatRow label={t("modals.totalBoxes")} value={totalItems} themeColors={themeColors} />
                <StatRow label={t("modals.unchecked")} value={uncheckedItems} warn isLast themeColors={themeColors} />
              </View>
            </View>
          ) : null}
        </View>
      )}

      <View className="mt-5 gap-2">
        <Button label={t("modals.endMove")} onPress={onConfirm} disabled={isLoadingStats} />
        <Button label={t("modals.continueMoving")} variant="secondary" onPress={onClose} />
      </View>
    </AppModal>
  );
}
