import { Button } from "@/components/button";
import { AppModal } from "@/components/ui/app-modal";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

type DeliveryModalProps = {
  visible: boolean;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeliveryModal({ visible, isLoading, error, onConfirm, onClose }: DeliveryModalProps) {
  const { t } = useTranslation();
  return (
    <AppModal
      visible={visible}
      title={t("modals.deliveryTitle")}
      description={t("modals.deliveryDesc")}
      onRequestClose={onClose}
    >
      {error ? <Text className="mb-3 text-sm text-crimson">{error}</Text> : null}
      <View className="gap-3">
        <Button
          label={isLoading ? t("modals.marking") : t("modals.markAsDelivered")}
          onPress={onConfirm}
          disabled={isLoading}
        />
        <Button label={t("common.cancel")} variant="secondary" onPress={onClose} disabled={isLoading} />
      </View>
    </AppModal>
  );
}
