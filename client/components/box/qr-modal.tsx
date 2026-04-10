import { Button } from "@/components/button";
import { AppModal } from "@/components/ui/app-modal";
import { Colors } from "@/constants/theme";
import { type BluetoothDevice } from "@/hooks/use-bluetooth-printer";
import { type QrMatrix } from "@/utils/box-qr";
import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

const QR_DISPLAY_SIZE = 196;

type QrDarkCell = { x: number; y: number; size: number; key: string };

type QrModalProps = {
  visible: boolean;
  isGeneratingQr: boolean;
  qrMatrix: QrMatrix | null;
  qrDarkCells: QrDarkCell[];
  qrErrorMessage: string | null;
  isPrinting: boolean;
  printError: string | null;
  savedPrinterName: string | null;
  pairedDevices: BluetoothDevice[];
  isScanning: boolean;
  scanError: string | null;
  onClose: () => void;
  onPrint: () => void;
  onSelectPrinter: () => void;
  onSelectDevice: (device: BluetoothDevice) => void;
  onRescan: () => void;
  onRegenerate: () => void;
};

export function QrModal({
  visible,
  isGeneratingQr,
  qrMatrix,
  qrDarkCells,
  qrErrorMessage,
  isPrinting,
  printError,
  savedPrinterName,
  pairedDevices,
  isScanning,
  scanError,
  onClose,
  onPrint,
  onSelectPrinter,
  onSelectDevice,
  onRescan,
  onRegenerate,
}: QrModalProps) {
  const [view, setView] = useState<"qr" | "printer">("qr");

  useEffect(() => {
    if (!visible) {
      setView("qr");
    }
  }, [visible]);

  const handleOpenPrinterPicker = () => {
    setView("printer");
    onSelectPrinter();
  };

  const handleSelectDevice = (device: BluetoothDevice) => {
    onSelectDevice(device);
    setView("qr");
  };

  const handleRequestClose = () => {
    if (view === "printer") {
      setView("qr");
    } else {
      onClose();
    }
  };

  return (
    <AppModal
      visible={visible}
      title={view === "printer" ? "Select Printer" : "Box QR label"}
      description={
        view === "printer"
          ? "Paired and nearby Bluetooth printers will appear below."
          : "Scan this QR code to open the box directly in the app."
      }
      onRequestClose={handleRequestClose}
      showCornerClose
      maxWidth={420}
    >
      {view === "printer" ? (
        <PrinterPickerContent
          pairedDevices={pairedDevices}
          isScanning={isScanning}
          scanError={scanError}
          onSelectDevice={handleSelectDevice}
          onRescan={onRescan}
        />
      ) : isGeneratingQr ? (
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

          <View className="mt-4 flex-row items-center justify-between rounded-control border border-border-default bg-bg-input/60 px-4 py-3">
            <View className="flex-row items-center gap-2">
              <Feather name="printer" size={14} color={Colors.dark.textTertiary} />
              <Text className="text-xs text-text-tertiary">
                {savedPrinterName ?? "No printer selected"}
              </Text>
            </View>
            <Pressable onPress={handleOpenPrinterPicker} hitSlop={8}>
              <Text className="text-xs font-semibold text-primary">
                {savedPrinterName ? "Change" : "Select"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-3">
            <Button
              label={isPrinting ? "Printing..." : "Print"}
              onPress={onPrint}
              disabled={isPrinting || !savedPrinterName}
              className="flex-1"
            />
            <Button
              label="Regenerate"
              variant="secondary"
              onPress={onRegenerate}
              disabled={isPrinting}
              className="flex-1"
            />
          </View>

          {printError ? <Text className="mt-3 text-xs text-crimson">{printError}</Text> : null}
        </>
      ) : (
        <View className="rounded-control border border-border-default bg-bg-input/60 px-4 py-4">
          <Text className="text-sm font-semibold text-text-primary">Could not generate QR code.</Text>
          <Text className="mt-1 text-xs text-text-tertiary">{qrErrorMessage ?? "Try generating again."}</Text>
          <Button label="Retry" variant="secondary" onPress={onRegenerate} className="mt-4" />
        </View>
      )}
    </AppModal>
  );
}

type PrinterPickerContentProps = {
  pairedDevices: BluetoothDevice[];
  isScanning: boolean;
  scanError: string | null;
  onSelectDevice: (device: BluetoothDevice) => void;
  onRescan: () => void;
};

function PrinterPickerContent({
  pairedDevices,
  isScanning,
  scanError,
  onSelectDevice,
  onRescan,
}: PrinterPickerContentProps) {
  if (isScanning) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator />
        <Text className="mt-3 text-xs text-text-tertiary">Scanning for printers...</Text>
      </View>
    );
  }

  if (scanError) {
    return (
      <View className="gap-4">
        <View className="rounded-control border border-border-default bg-bg-input/60 px-4 py-4">
          <Text className="text-sm font-semibold text-crimson">Bluetooth error</Text>
          <Text className="mt-1 text-xs text-text-tertiary">{scanError}</Text>
        </View>
        <RescanButton onRescan={onRescan} />
      </View>
    );
  }

  if (pairedDevices.length === 0) {
    return (
      <View className="gap-4">
        <View className="rounded-control border border-border-default bg-bg-input/60 px-4 py-4">
          <Text className="text-sm font-semibold text-text-primary">No devices found</Text>
          <Text className="mt-1 text-xs text-text-tertiary">
            Make sure your printer is on and in range. Pair it in Android Bluetooth settings for best results.
          </Text>
        </View>
        <RescanButton onRescan={onRescan} />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        {pairedDevices.map((device) => (
          <Pressable
            key={device.address}
            onPress={() => onSelectDevice(device)}
            className="flex-row items-center rounded-control border border-border-default bg-bg-input/60 px-4 py-3 active:opacity-70"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
              <Feather name="printer" size={16} color={Colors.dark.primary} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-text-primary">{device.name}</Text>
              <Text className="text-xs text-text-tertiary">{device.address}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.dark.textTertiary} />
          </Pressable>
        ))}
      </View>
      <RescanButton onRescan={onRescan} />
    </View>
  );
}

function RescanButton({ onRescan }: { onRescan: () => void }) {
  return (
    <Pressable
      onPress={onRescan}
      className="flex-row items-center justify-center gap-2 py-1 active:opacity-60"
    >
      <Feather name="refresh-cw" size={13} color={Colors.dark.textTertiary} />
      <Text className="text-xs text-text-tertiary">Scan again</Text>
    </Pressable>
  );
}
