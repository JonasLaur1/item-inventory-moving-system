import { Button } from "@/components/button";
import { AppModal } from "@/components/ui/app-modal";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

type UnpackModalProps = {
  visible: boolean;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function UnpackModal({ visible, isLoading, error, onConfirm, onClose }: UnpackModalProps) {
  const { t } = useTranslation();
  return (
    <AppModal
      visible={visible}
      title={t("modals.unpackTitle")}
      description={t("modals.unpackDesc")}
      onRequestClose={onClose}
    >
      {error ? <Text className="mb-3 text-sm text-crimson">{error}</Text> : null}
      <View className="gap-3">
        <Button
          label={isLoading ? t("common.saving") : t("common.confirm")}
          onPress={onConfirm}
          disabled={isLoading}
        />
        <Button label={t("common.cancel")} variant="secondary" onPress={onClose} disabled={isLoading} />
      </View>
    </AppModal>
  );
}
