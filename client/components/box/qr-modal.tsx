import { Button } from "@/components/button";
import { AppModal } from "@/components/ui/app-modal";
import { type QrMatrix } from "@/utils/box-qr";
import { ActivityIndicator, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

const QR_DISPLAY_SIZE = 196;

type QrDarkCell = { x: number; y: number; size: number; key: string };

type QrModalProps = {
  visible: boolean;
  isGeneratingQr: boolean;
  qrMatrix: QrMatrix | null;
  qrDarkCells: QrDarkCell[];
  qrErrorMessage: string | null;
  isSharingQr: boolean;
  shareQrError: string | null;
  onClose: () => void;
  onPrint: () => void;
  onRegenerate: () => void;
};

export function QrModal({
  visible,
  isGeneratingQr,
  qrMatrix,
  qrDarkCells,
  qrErrorMessage,
  isSharingQr,
  shareQrError,
  onClose,
  onPrint,
  onRegenerate,
}: QrModalProps) {
  return (
    <AppModal
      visible={visible}
      title="Box QR label"
      description="Scan this QR code to open the box directly in the app."
      onRequestClose={onClose}
      showCornerClose
      maxWidth={420}
    >
      {isGeneratingQr ? (
        <View className="items-center justify-center rounded-control border border-border-default bg-bg-input/60 px-4 py-8">
          <ActivityIndicator />
          <Text className="mt-3 text-xs text-text-tertiary">Generating QR code...</Text>
        </View>
      ) : qrMatrix ? (
        <>
          <View className="items-center rounded-control border border-border-default bg-bg-input/60 px-4 py-4">
            <Svg
              width={QR_DISPLAY_SIZE}
              height={QR_DISPLAY_SIZE}
              viewBox={`0 0 ${QR_DISPLAY_SIZE} ${QR_DISPLAY_SIZE}`}
            >
              <Rect x={0} y={0} width={QR_DISPLAY_SIZE} height={QR_DISPLAY_SIZE} fill="#FFFFFF" />
              {qrDarkCells.map((cell) => (
                <Rect
                  key={cell.key}
                  x={cell.x}
                  y={cell.y}
                  width={cell.size}
                  height={cell.size}
                  fill="#000000"
                />
              ))}
            </Svg>
          </View>
          <View className="mt-4 flex-row gap-3">
            <Button
              label={isSharingQr ? "Printing..." : "Print"}
              onPress={onPrint}
              disabled={isSharingQr}
              className="flex-1"
            />
            <Button
              label="Regenerate"
              variant="secondary"
              onPress={onRegenerate}
              disabled={isSharingQr}
              className="flex-1"
            />
          </View>
        </>
      ) : (
        <View className="rounded-control border border-border-default bg-bg-input/60 px-4 py-4">
          <Text className="text-sm font-semibold text-text-primary">Could not generate QR code.</Text>
          <Text className="mt-1 text-xs text-text-tertiary">{qrErrorMessage ?? "Try generating again."}</Text>
          <Button label="Retry" variant="secondary" onPress={onRegenerate} className="mt-4" />
        </View>
      )}

      {shareQrError ? <Text className="mt-3 text-xs text-crimson">{shareQrError}</Text> : null}
    </AppModal>
  );
}
