import { Button } from "@/components/button";
import { AppModal } from "@/components/ui/app-modal";
import { Text, View } from "react-native";

type DeliveryModalProps = {
  visible: boolean;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeliveryModal({ visible, isLoading, error, onConfirm, onClose }: DeliveryModalProps) {
  return (
    <AppModal
      visible={visible}
      title="Box Delivered?"
      description="Mark this box as delivered to its destination?"
      onRequestClose={onClose}
    >
      {error ? <Text className="mb-3 text-sm text-crimson">{error}</Text> : null}
      <View className="gap-3">
        <Button
          label={isLoading ? "Marking..." : "Mark as Delivered"}
          onPress={onConfirm}
          disabled={isLoading}
        />
        <Button label="Cancel" variant="secondary" onPress={onClose} disabled={isLoading} />
      </View>
    </AppModal>
  );
}
