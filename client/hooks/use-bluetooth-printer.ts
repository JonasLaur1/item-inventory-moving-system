import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeviceEventEmitter, PermissionsAndroid, Platform } from "react-native";
import { generateQrMatrix, type QrMatrix } from "@/utils/box-qr";

// Event names emitted by react-native-bluetooth-escpos-printer's BluetoothManager
const BT_EVENT_PAIRED = "EVENT_DEVICE_ALREADY_PAIRED";
const BT_EVENT_FOUND = "EVENT_DEVICE_FOUND";
const BT_EVENT_DONE = "EVENT_DEVICE_DISCOVER_DONE";

type BtModule = {
  BluetoothManager: {
    enableBluetooth: () => Promise<unknown>;
    scanDevices: () => Promise<string>;
    connect: (address: string) => Promise<void>;
  };
  BluetoothEscposPrinter: {
    sendRawData: (base64: string) => Promise<void>;
  };
};

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  } else {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
}

function loadBtModule(): BtModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-bluetooth-escpos-printer") as BtModule;
    if (!mod?.BluetoothManager || !mod?.BluetoothEscposPrinter) {
      return null;
    }
    return mod;
  } catch {
    return null;
  }
}

// ─── Brother QL raster protocol ────────────────────────────────────────────
// QL-820NWB: 300 dpi, 62 mm roll → 720 printable pixels = 90 bytes per line.
const BYTES_PER_LINE = 90;
const QUIET_ZONE_MODULES = 4;
const TOP_MARGIN_PX = 20;
const BOTTOM_MARGIN_PX = 20;

/**
 * Build a complete Brother QL raster print payload for a QR code.
 * Protocol reference: Brother P-touch Raster Command Reference (QL series).
 */
function buildBrotherRasterBytes(qrMatrix: QrMatrix): Uint8Array {
  const totalModules = qrMatrix.size + QUIET_ZONE_MODULES * 2;
  const modulePixels = Math.floor((BYTES_PER_LINE * 8) / totalModules);
  const qrAreaPixels = modulePixels * totalModules;
  const leftPadPx = Math.floor(((BYTES_PER_LINE * 8) - qrAreaPixels) / 2);
  const qrHeightPx = modulePixels * totalModules;

  const buildRasterLine = (pixRow: number): Uint8Array => {
    const modRow = Math.floor(pixRow / modulePixels) - QUIET_ZONE_MODULES;
    const line = new Uint8Array(BYTES_PER_LINE);
    for (let pixCol = 0; pixCol < BYTES_PER_LINE * 8; pixCol++) {
      const modCol = Math.floor((pixCol - leftPadPx) / modulePixels) - QUIET_ZONE_MODULES;
      const dark =
        modRow >= 0 && modRow < qrMatrix.size &&
        modCol >= 0 && modCol < qrMatrix.size &&
        qrMatrix.modules[modRow * qrMatrix.size + modCol] === true;
      if (dark) {
        line[Math.floor(pixCol / 8)] |= 1 << (7 - (pixCol % 8));
      }
    }
    return line;
  };

  const blankLine = new Uint8Array(BYTES_PER_LINE);
  const numRasterLines = TOP_MARGIN_PX + qrHeightPx + BOTTOM_MARGIN_PX;

  // Assemble protocol commands
  const parts: Uint8Array[] = [];

  // 1. Invalidate (clear printer buffer)
  parts.push(new Uint8Array(200));
  // 2. Initialize
  parts.push(new Uint8Array([0x1b, 0x40]));
  // 3. Switch to raster graphics mode
  parts.push(new Uint8Array([0x1b, 0x69, 0x61, 0x01]));
  // 4. Print information: ESC i z (10 parameter bytes)
  //    DK-22251: 62 mm continuous black/red roll on QL-820NWB.
  //    PI=0x00 (no validation), QI=0x0A (continuous), W=62 mm, L=0 (continuous).
  parts.push(new Uint8Array([
    0x1b, 0x69, 0x7a,
    0x80,                                  // PI: no media validation
    0x0a,                                  // QI: continuous tape
    62,                                    // W: 62 mm
    0,                                     // L: continuous
    numRasterLines & 0xff,
    (numRasterLines >> 8) & 0xff,
    (numRasterLines >> 16) & 0xff,
    (numRasterLines >> 24) & 0xff,
    0x00,                                  // starting page
    0x00,                                  // reserved
  ]));
  // 5. Various mode: auto-cut enabled (bit 6 = 0x40)
  parts.push(new Uint8Array([0x1b, 0x69, 0x4d, 0x40]));
  // 6. Advanced mode: cut at end (0x01), not chain printing (0x08)
  parts.push(new Uint8Array([0x1b, 0x69, 0x4b, 0x01]));
  // 7. Compression: none
  parts.push(new Uint8Array([0x4d, 0x00]));

  // DK-22251 (black + red two-color): must use `w` (0x77) with two separate plane commands
  // per line — single-plane `g` (0x67) commands cause "wrong roll type" on the QL-820NWB.
  const redPlane = new Uint8Array(BYTES_PER_LINE); // red plane always zero (black-only label)
  const pushLine = (data: Uint8Array): void => {
    parts.push(new Uint8Array([0x77, 0x01, BYTES_PER_LINE, ...data]));     // black plane
    parts.push(new Uint8Array([0x77, 0x02, BYTES_PER_LINE, ...redPlane])); // red plane (empty)
  };

  // 8. Raster lines: top margin + QR code + bottom margin
  for (let i = 0; i < TOP_MARGIN_PX; i++) pushLine(blankLine);
  for (let row = 0; row < qrHeightPx; row++) pushLine(buildRasterLine(row));
  for (let i = 0; i < BOTTOM_MARGIN_PX; i++) pushLine(blankLine);

  // 9. Print with feeding
  parts.push(new Uint8Array([0x1a]));

  // Concatenate all parts into one buffer
  const totalBytes = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Convert Uint8Array to base64 string without using Buffer (works in Hermes). */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return btoa(binary);
}

// ─── Storage keys ───────────────────────────────────────────────────────────
const STORAGE_KEY_ADDRESS = "@boxit/bt-printer-address";
const STORAGE_KEY_NAME = "@boxit/bt-printer-name";

export type BluetoothDevice = {
  address: string;
  name: string;
};

export type UseBluetoothPrinterResult = {
  savedPrinter: BluetoothDevice | null;
  pairedDevices: BluetoothDevice[];
  isScanning: boolean;
  scanError: string | null;
  isPrinting: boolean;
  printError: string | null;
  prepareScan: () => Promise<void>;
  rescan: () => Promise<void>;
  selectPrinter: (device: BluetoothDevice) => Promise<void>;
  forgetPrinter: () => Promise<void>;
  printLabel: (boxName: string, qrValue: string) => Promise<void>;
};

export function useBluetoothPrinter(): UseBluetoothPrinterResult {
  const [savedPrinter, setSavedPrinter] = useState<BluetoothDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const subscriptionsRef = useRef<{ remove: () => void }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [address, name] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_ADDRESS),
          AsyncStorage.getItem(STORAGE_KEY_NAME),
        ]);
        if (address) {
          setSavedPrinter({ address, name: name ?? address });
        }
      } catch {
        // ignore storage errors on mount
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.remove());
    };
  }, []);

  const removeListeners = useCallback(() => {
    subscriptionsRef.current.forEach((sub) => sub.remove());
    subscriptionsRef.current = [];
  }, []);

  const startScan = useCallback(async () => {
    const btModule = loadBtModule();
    if (!btModule) {
      setScanError("Bluetooth printing is not available on this device.");
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setPairedDevices([]);
    removeListeners();

    const sub1 = DeviceEventEmitter.addListener(BT_EVENT_PAIRED, (event: { devices: string }) => {
      try {
        const devices = JSON.parse(event.devices) as BluetoothDevice[];
        setPairedDevices(devices.filter((d) => Boolean(d.name) && Boolean(d.address)));
      } catch {
        // ignore parse errors
      }
    });

    const sub2 = DeviceEventEmitter.addListener(BT_EVENT_FOUND, (event: { device: string }) => {
      try {
        const device = JSON.parse(event.device) as BluetoothDevice;
        if (device.name && device.address) {
          setPairedDevices((prev) =>
            prev.some((d) => d.address === device.address) ? prev : [...prev, device],
          );
        }
      } catch {
        // ignore parse errors
      }
    });

    const sub3 = DeviceEventEmitter.addListener(BT_EVENT_DONE, () => {
      setIsScanning(false);
      removeListeners();
    });

    subscriptionsRef.current = [sub1, sub2, sub3];

    try {
      await btModule.BluetoothManager.scanDevices();
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Failed to scan for Bluetooth devices.");
      setIsScanning(false);
      removeListeners();
    }
  }, [removeListeners]);

  const prepareScan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);
    setPairedDevices([]);

    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      setScanError(
        "Bluetooth permissions are required. Please allow them when prompted, or enable them in Settings > Apps > BoxIt > Permissions.",
      );
      setIsScanning(false);
      return;
    }

    const btModule = loadBtModule();
    if (!btModule) {
      setScanError("Bluetooth printing is not available on this device.");
      setIsScanning(false);
      return;
    }

    try {
      await btModule.BluetoothManager.enableBluetooth();
    } catch {
      setScanError("Please enable Bluetooth and try again.");
      setIsScanning(false);
      return;
    }

    await startScan();
  }, [startScan]);

  const rescan = useCallback(async () => {
    await startScan();
  }, [startScan]);

  const selectPrinter = useCallback(async (device: BluetoothDevice) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEY_ADDRESS, device.address],
      [STORAGE_KEY_NAME, device.name],
    ]);
    setSavedPrinter(device);
  }, []);

  const forgetPrinter = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEY_ADDRESS, STORAGE_KEY_NAME]);
    setSavedPrinter(null);
  }, []);

  const printLabel = useCallback(
    async (_boxName: string, qrValue: string) => {
      if (!savedPrinter) {
        setPrintError("No printer selected. Tap 'Select Printer' first.");
        return;
      }

      const btModule = loadBtModule();
      if (!btModule) {
        setPrintError("Bluetooth printing is not available on this device.");
        return;
      }

      if (typeof btModule.BluetoothEscposPrinter.sendRawData !== "function") {
        setPrintError("sendRawData not available – rebuild the app after the patch.");
        return;
      }

      setIsPrinting(true);
      setPrintError(null);

      try {
        console.log("[BTPrint] connecting to", savedPrinter.address);
        await btModule.BluetoothManager.connect(savedPrinter.address);
        console.log("[BTPrint] connected, waiting 500ms");
        await new Promise<void>((resolve) => setTimeout(resolve, 500));

        console.log("[BTPrint] generating QR matrix for", qrValue);
        const qrMatrix = generateQrMatrix(qrValue);

        console.log("[BTPrint] building Brother raster payload");
        const payload = buildBrotherRasterBytes(qrMatrix);
        const base64 = toBase64(payload);
        console.log("[BTPrint] sending", payload.length, "bytes via sendRawData");

        await btModule.BluetoothEscposPrinter.sendRawData(base64);
        console.log("[BTPrint] done");
      } catch (error) {
        console.log("[BTPrint] error", error);
        const msg =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error);
        setPrintError(msg || "Printing failed. Make sure the printer is on and paired.");
      } finally {
        setIsPrinting(false);
      }
    },
    [savedPrinter],
  );

  return {
    savedPrinter,
    pairedDevices,
    isScanning,
    scanError,
    isPrinting,
    printError,
    prepareScan,
    rescan,
    selectPrinter,
    forgetPrinter,
    printLabel,
  };
}
