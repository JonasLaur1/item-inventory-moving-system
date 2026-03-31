import { Button } from "@/components/button";
import { AppModal } from "@/components/ui/app-modal";
import { Text, View } from "react-native";

type UnpackModalProps = {
  visible: boolean;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function UnpackModal({ visible, isLoading, error, onConfirm, onClose }: UnpackModalProps) {
  return (
    <AppModal
      visible={visible}
      title="Mark as Unpacked?"
      description="Mark this box as unpacked at its destination? This completes the delivery lifecycle for this box."
      onRequestClose={onClose}
    >
      {error ? <Text className="mb-3 text-sm text-crimson">{error}</Text> : null}
      <View className="gap-3">
        <Button
          label={isLoading ? "Updating..." : "Confirm"}
          onPress={onConfirm}
          disabled={isLoading}
        />
        <Button label="Cancel" variant="secondary" onPress={onClose} disabled={isLoading} />
      </View>
    </AppModal>
  );
}
