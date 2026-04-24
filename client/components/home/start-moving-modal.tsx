import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/button";
import { type LocationSummary } from "@/lib/location.service";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { useTranslation } from "react-i18next";

type Props = {
  visible: boolean;
  locations: LocationSummary[];
  onConfirm: (fromLocationId: string, fromLocationName: string, toLocationId: string, toLocationName: string) => void;
  onClose: () => void;
};

type LocationPickerProps = {
  label: string;
  selectedId: string | null;
  locations: LocationSummary[];
  disabledId: string | null;
  onSelect: (id: string) => void;
  iconColor: string;
};

function LocationPicker({ label, selectedId, locations, disabledId, onSelect, iconColor }: LocationPickerProps) {
  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-text-secondary">{label}</Text>
      <View className="gap-2">
        {locations.map((loc) => {
          const isSelected = loc.id === selectedId;
          const isDisabled = loc.id === disabledId;
          return (
            <Pressable
              key={loc.id}
              onPress={() => !isDisabled && onSelect(loc.id)}
              className={`flex-row items-center rounded-control border px-4 py-3 ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : isDisabled
                    ? "border-border-default bg-bg-input opacity-40"
                    : "border-border-default bg-bg-input"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            >
              <Text className={`flex-1 text-sm font-medium ${isSelected ? "text-primary" : "text-text-primary"}`}>
                {loc.name}
              </Text>
              {isSelected ? <Feather name="check" size={16} color={iconColor} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function StartMovingModal({ visible, locations, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const { resolvedTheme } = useThemePreference();
  const primaryColor = Colors[resolvedTheme].primary;

  const canConfirm = fromId !== null && toId !== null;

  const handleClose = () => {
    setFromId(null);
    setToId(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!fromId || !toId) return;
    const fromName = locations.find((l) => l.id === fromId)?.name ?? fromId;
    const toName = locations.find((l) => l.id === toId)?.name ?? toId;
    onConfirm(fromId, fromName, toId, toName);
    setFromId(null);
    setToId(null);
  };

  return (
    <AppModal
      visible={visible}
      title={t("modals.startMovingTitle")}
      description={t("modals.startMovingDesc")}
      onRequestClose={handleClose}
      showCornerClose
      closeOnBackdropPress
    >
      <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
        <View className="gap-5">
          <LocationPicker
            label={t("movingProgress.from")}
            selectedId={fromId}
            locations={locations}
            disabledId={toId}
            onSelect={setFromId}
            iconColor={primaryColor}
          />
          <LocationPicker
            label={t("movingProgress.to")}
            selectedId={toId}
            locations={locations}
            disabledId={fromId}
            onSelect={setToId}
            iconColor={primaryColor}
          />
        </View>
      </ScrollView>
      <View className="mt-5 gap-2">
        <Button label={t("home.startMoving")} variant="primary" onPress={handleConfirm} disabled={!canConfirm} />
        <Button label={t("common.cancel")} variant="secondary" onPress={handleClose} />
      </View>
    </AppModal>
  );
}
