import { Button } from "@/components/button";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_LINK_HOSTS = new Set(["boxit.app", "www.boxit.app"]);

function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractBoxIdFromPath(pathname: string): string | null {
  const segments = pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2 || segments[0]?.toLowerCase() !== "box") {
    return null;
  }

  const candidate = safeDecodeUriComponent(segments[1] ?? "").trim();
  return candidate || null;
}

function parseScannedBoxId(payload: string): string | null {
  const normalizedPayload = payload.trim();

  if (!normalizedPayload) {
    return null;
  }

  const customSchemeMatch = normalizedPayload.match(/^client:\/\/box\/([^/?#]+)/i);
  if (customSchemeMatch?.[1]) {
    return safeDecodeUriComponent(customSchemeMatch[1]).trim() || null;
  }

  try {
    const parsedUrl = new URL(normalizedPayload);
    const protocol = parsedUrl.protocol.toLowerCase();
    const host = parsedUrl.hostname.toLowerCase();

    if (protocol === "https:" || protocol === "http:") {
      if (APP_LINK_HOSTS.has(host)) {
        return extractBoxIdFromPath(parsedUrl.pathname);
      }

      return null;
    }

    if (protocol !== "client:") {
      return null;
    }

    if (host === "box") {
      const candidateFromHostPath = safeDecodeUriComponent(parsedUrl.pathname.replace(/^\/+/, "")).trim();
      return candidateFromHostPath || null;
    }

    return extractBoxIdFromPath(parsedUrl.pathname);
  } catch {
    return null;
  }
}

export default function ScanTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [isHandlingScan, setIsHandlingScan] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsHandlingScan(false);
      setScanError(null);
    }, []),
  );

  const onBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (isHandlingScan) {
        return;
      }

      setIsHandlingScan(true);
      const boxId = parseScannedBoxId(data);

      if (!boxId) {
        setScanError("Unsupported QR code. Use a BoxIt box QR label.");
        setTimeout(() => {
          setIsHandlingScan(false);
        }, 1200);
        return;
      }

      setScanError(null);
      router.push({ pathname: "/box/[id]", params: { id: boxId } });
    },
    [isHandlingScan, router],
  );

  const onPressAllowCamera = useCallback(async () => {
    const response = await requestPermission();
    if (!response.granted) {
      setScanError("Camera permission is required to scan QR codes.");
    } else {
      setScanError(null);
    }
  }, [requestPermission]);

  const onPressOpenSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const onPressClose = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  const topOffset = insets.top + 12;
  const bottomOffset = insets.bottom + 16;
  const showBottomOverlay = Boolean(scanError);

  return (
    <View className="flex-1 bg-bg-base">
      {!permission ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator />
          <Text className="mt-3 text-sm text-text-tertiary">Loading camera permission...</Text>
        </View>
      ) : !permission.granted ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-text-primary">
            Camera access is required
          </Text>
          <Text className="mt-2 text-center text-sm text-text-tertiary">
            Allow camera permission to scan and open box QR labels.
          </Text>
          <View className="mt-5 w-full gap-3">
            <Button label="Allow Camera" onPress={() => void onPressAllowCamera()} />
            <Button label="Open Settings" variant="secondary" onPress={onPressOpenSettings} />
          </View>
        </View>
      ) : (
        <>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={isHandlingScan ? undefined : onBarcodeScanned}
          />
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View className="h-64 w-64 rounded-3xl border-2 border-white/95" />
          </View>
        </>
      )}

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        style={{ top: topOffset }}
      >
        <Pressable
          onPress={onPressClose}
          hitSlop={10}
          className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/45"
        >
          <Feather name="x" size={20} color="#FFFFFF" />
        </Pressable>
        <View className="w-11" />
      </View>

      {showBottomOverlay ? (
        <View
          className="absolute left-4 right-4 rounded-control border border-crimson/40 bg-black/55 px-4 py-3"
          style={{ bottom: bottomOffset }}
        >
          <Text className="text-center text-sm text-crimson">{scanError}</Text>
        </View>
      ) : null}
    </View>
  );
}
