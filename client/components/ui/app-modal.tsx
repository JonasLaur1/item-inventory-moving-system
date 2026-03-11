import { type ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";

type AppModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  onRequestClose: () => void;
  children?: ReactNode;
  maxWidth?: number;
  closeOnBackdropPress?: boolean;
  contentClassName?: string;
};

export function AppModal({
  visible,
  title,
  description,
  onRequestClose,
  children,
  maxWidth = 420,
  closeOnBackdropPress = false,
  contentClassName = "",
}: AppModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        {closeOnBackdropPress ? (
          <Pressable className="absolute inset-0" onPress={onRequestClose} />
        ) : null}

        <View
          className={`w-full rounded-modal border border-border-default bg-bg-elevated p-5 shadow-modal ${contentClassName}`}
          style={{ maxWidth }}
        >
          <Text className="text-lg font-semibold text-text-primary">{title}</Text>
          {description ? (
            <Text className="mt-2 text-sm leading-5 text-text-secondary">{description}</Text>
          ) : null}

          {children ? <View className="mt-5">{children}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
