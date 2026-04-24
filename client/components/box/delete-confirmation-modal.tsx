import { Button } from "@/components/button";
import { AppModal } from "@/components/ui/app-modal";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

type DeleteConfirmationModalProps = {
  visible: boolean;
  title: string;
  description: string;
  isDeleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmationModal({
  visible,
  title,
  description,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation();
  return (
    <AppModal
      visible={visible}
      title={title}
      description={description}
      onRequestClose={onClose}
      maxWidth={420}
    >
      {error ? <Text className="text-xs text-crimson">{error}</Text> : null}

      <View className={`${error ? "mt-4" : ""} flex-row gap-3`}>
        <Button
          label={t("common.cancel")}
          variant="secondary"
          onPress={onClose}
          disabled={isDeleting}
          className="flex-1"
        />
        <Button
          label={isDeleting ? t("common.deleting") : t("common.delete")}
          variant="secondary"
          onPress={onConfirm}
          disabled={isDeleting}
          className="flex-1 border-crimson/60 bg-crimson/10"
          textClassName="text-crimson"
        />
      </View>
    </AppModal>
  );
}
