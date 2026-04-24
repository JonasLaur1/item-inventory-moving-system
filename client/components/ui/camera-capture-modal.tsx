import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type CaptureResult = {
  uri: string;
  base64: string | null;
  suggestedName: string | null;
  suggestedNotes: string | null;
};

type RecognitionState =
  | { status: "idle" }
  | { status: "recognizing" }
  | { status: "done"; name: string; notes: string | null }
  | { status: "error"; message: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: CaptureResult) => void;
};

async function callRecognizeItem(
  imageBase64: string,
): Promise<{ name: string; notes: string | null }> {
  const { data, error } = await supabase.functions.invoke<{
    name?: string;
    notes?: string | null;
    error?: string;
  }>("recognize-item", { body: { imageBase64 } });

  if (error) {
    throw new Error(error.message ?? "Recognition failed.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.name) {
    throw new Error("Could not identify item.");
  }

  return { name: data.name, notes: data.notes ?? null };
}

export function CameraCaptureModal({ visible, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<"camera" | "preview">("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<RecognitionState>({ status: "idle" });
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPhase("camera");
      setCapturedUri(null);
      setCapturedBase64(null);
      setRecognition({ status: "idle" });
      setIsCapturing(false);
    }
  }, [visible]);

  const runRecognition = useCallback(async (base64: string) => {
    setRecognition({ status: "recognizing" });
    try {
      const result = await callRecognizeItem(base64);
      setRecognition({ status: "done", name: result.name, notes: result.notes });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("camera.recognitionFailed");
      setRecognition({ status: "error", message });
    }
  }, [t]);

  const handleCapture = useCallback(async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.2,
        base64: true,
      });

      if (!photo) {
        return;
      }

      setCapturedUri(photo.uri);
      setCapturedBase64(photo.base64 ?? null);
      setPhase("preview");

      if (photo.base64) {
        void runRecognition(photo.base64);
      } else {
        setRecognition({ status: "error", message: t("camera.couldNotProcess") });
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, runRecognition, t]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setCapturedBase64(null);
    setRecognition({ status: "idle" });
    setIsCapturing(false);
    setPhase("camera");
  }, []);

  const handleConfirm = useCallback(
    (withSuggestion: boolean) => {
      if (!capturedUri) return;
      const isDone = recognition.status === "done";
      onConfirm({
        uri: capturedUri,
        base64: capturedBase64,
        suggestedName: withSuggestion && isDone ? recognition.name : null,
        suggestedNotes: withSuggestion && isDone ? recognition.notes : null,
      });
    },
    [capturedUri, recognition, onConfirm],
  );

  const handleRetryRecognition = useCallback(() => {
    if (capturedBase64) {
      void runRecognition(capturedBase64);
    }
  }, [capturedBase64, runRecognition]);

  const topPad = insets.top + 12;
  const bottomPad = insets.bottom + 24;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        {phase === "camera" ? (
          <>
            {!permission ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#fff" />
              </View>
            ) : !permission.granted ? (
              <View className="flex-1 items-center justify-center gap-4 px-8">
                <Text className="text-center text-base font-semibold text-white">
                  {t("camera.accessRequired")}
                </Text>
                <Text className="text-center text-sm text-white/60">
                  {t("camera.accessRequiredDesc")}
                </Text>
                {permission.canAskAgain ? (
                  <Pressable
                    onPress={() => void requestPermission()}
                    className="rounded-control bg-white px-6 py-3"
                  >
                    <Text className="font-semibold text-black">{t("camera.allowCamera")}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void Linking.openSettings()}
                    className="rounded-control bg-white px-6 py-3"
                  >
                    <Text className="font-semibold text-black">{t("camera.openSettings")}</Text>
                  </Pressable>
                )}
                <Pressable onPress={onClose} hitSlop={10}>
                  <Text className="text-sm text-white/50">{t("common.cancel")}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
                <View pointerEvents="box-none" className="absolute inset-0">
                  <View
                    className="absolute left-0 right-0 flex-row px-4"
                    style={{ top: topPad }}
                  >
                    <Pressable
                      onPress={onClose}
                      hitSlop={10}
                      className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/45"
                    >
                      <Feather name="x" size={20} color="#fff" />
                    </Pressable>
                  </View>
                  <View
                    className="absolute left-0 right-0 items-center"
                    style={{ bottom: bottomPad }}
                  >
                    <Text className="mb-5 text-sm text-white/70">
                      {t("camera.takePhotoHint")}
                    </Text>
                    <Pressable
                      onPress={() => void handleCapture()}
                      disabled={isCapturing}
                      style={{ width: 72, height: 72 }}
                      className="items-center justify-center rounded-full border-4 border-white bg-white/20"
                    >
                      {isCapturing ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View
                          style={{ width: 56, height: 56 }}
                          className="rounded-full bg-white"
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </>
        ) : (
          <>
            {capturedUri ? (
              <Image
                source={{ uri: capturedUri }}
                style={{ flex: 1 }}
                contentFit="cover"
              />
            ) : null}
            <View pointerEvents="box-none" className="absolute inset-0">
              <View
                className="absolute left-0 right-0 flex-row px-4"
                style={{ top: topPad }}
              >
                <Pressable
                  onPress={handleRetake}
                  hitSlop={10}
                  className="flex-row items-center gap-2 rounded-full border border-white/40 bg-black/45 px-4 py-2.5"
                >
                  <Feather name="rotate-ccw" size={16} color="#fff" />
                  <Text className="text-sm font-semibold text-white">{t("camera.retake")}</Text>
                </Pressable>
              </View>

              <View
                className="absolute left-4 right-4 rounded-2xl bg-black/72 px-5 py-4"
                style={{ bottom: bottomPad }}
              >
                {recognition.status === "idle" || recognition.status === "recognizing" ? (
                  <View className="flex-row items-center gap-3">
                    <ActivityIndicator color="#fff" size="small" />
                    <Text className="text-sm text-white/80">{t("camera.identifying")}</Text>
                  </View>
                ) : recognition.status === "done" ? (
                  <View className="gap-3">
                    <View className="flex-row items-start gap-2">
                      <Feather
                        name="check-circle"
                        size={16}
                        color="#4ade80"
                        style={{ marginTop: 2 }}
                      />
                      <View className="flex-1">
                        <Text className="text-xs text-white/60">{t("camera.aiIdentified")}</Text>
                        <Text className="text-base font-bold text-white">
                          {recognition.name}
                        </Text>
                        {recognition.notes ? (
                          <Text className="mt-0.5 text-xs text-white/70">
                            {recognition.notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={handleRetake}
                        className="flex-1 items-center rounded-control border border-white/30 py-2.5"
                      >
                        <Text className="text-sm font-semibold text-white/80">{t("camera.retake")}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleConfirm(true)}
                        className="flex-1 items-center rounded-control bg-white py-2.5"
                      >
                        <Text className="text-sm font-semibold text-black">{t("camera.usePhoto")}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                      <Feather name="alert-circle" size={16} color="#f87171" />
                      <Text className="flex-1 text-sm text-white/80">
                        {recognition.message}
                      </Text>
                    </View>
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={handleRetryRecognition}
                        className="flex-1 items-center rounded-control border border-white/30 py-2.5"
                      >
                        <Text className="text-sm font-semibold text-white/80">{t("camera.tryAgain")}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleConfirm(false)}
                        className="flex-1 items-center rounded-control bg-white py-2.5"
                      >
                        <Text className="text-sm font-semibold text-black">
                          {t("camera.useWithoutAi")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
