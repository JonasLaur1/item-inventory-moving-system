import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { AppModal } from "@/components/ui/app-modal";
import { Colors } from "@/constants/theme";
import { ROOM_SUGGESTIONS } from "@/constants/room-suggestions";
import { locationService } from "@/lib/location.service";
import { roomService } from "@/lib/room.service";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (locationId: string) => void;
};

export function CreateLocationModal({ visible, onClose, onCreated }: Props) {
  const { resolvedTheme } = useThemePreference();
  const { height: windowHeight } = useWindowDimensions();

  const [step, setStep] = useState<1 | 2>(1);
  const [locationName, setLocationName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [pendingRooms, setPendingRooms] = useState<string[]>([]);
  const [customRoomInput, setCustomRoomInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setLocationName("");
      setLocationId("");
      setPendingRooms([]);
      setCustomRoomInput("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleStep1Submit = useCallback(async () => {
    const trimmed = locationName.trim();
    if (!trimmed) {
      setError("Location name is required.");
      return;
    }

    setError(null);
    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      const { id } = await locationService.createLocation(trimmed);
      setLocationId(id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create location.");
    } finally {
      setIsSubmitting(false);
    }
  }, [locationName]);

  const toggleSuggestion = useCallback((suggestion: string) => {
    setPendingRooms((prev) => {
      const normalizedSuggestion = suggestion.toLowerCase();
      const exists = prev.some((r) => r.toLowerCase() === normalizedSuggestion);
      return exists ? prev.filter((r) => r.toLowerCase() !== normalizedSuggestion) : [...prev, suggestion];
    });
  }, []);

  const handleAddCustomRoom = useCallback(() => {
    const trimmed = customRoomInput.trim();
    if (!trimmed) {
      return;
    }

    const isDuplicate = pendingRooms.some((r) => r.toLowerCase() === trimmed.toLowerCase());
    if (!isDuplicate) {
      setPendingRooms((prev) => [...prev, trimmed]);
    }

    setCustomRoomInput("");
  }, [customRoomInput, pendingRooms]);

  const removeRoom = useCallback((index: number) => {
    setPendingRooms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const finishCreation = useCallback(
    async (id: string, rooms: string[]) => {
      setIsSubmitting(true);
      setError(null);

      try {
        for (const name of rooms) {
          await roomService.createRoom({ locationId: id, name });
        }

        onCreated?.(id);
        onClose();
      } catch {
        setError("Location created but some rooms could not be saved. You can add rooms from the location page.");
        setIsSubmitting(false);
      }
    },
    [onClose, onCreated],
  );

  const handleRequestClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    if (step === 2) {
      void finishCreation(locationId, []);
      return;
    }

    onClose();
  }, [finishCreation, isSubmitting, locationId, onClose, step]);

  const iconColor = Colors[resolvedTheme].textSecondary;

  return (
    <AppModal
      visible={visible}
      title={step === 1 ? "New Location" : "Add Rooms"}
      description={
        step === 1
          ? "Give your location a name (e.g. New Apartment, Storage Unit)."
          : `Which rooms does "${locationName.trim()}" have?`
      }
      onRequestClose={handleRequestClose}
      maxWidth={420}
    >
      {step === 1 ? (
        <>
          <FormInput
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Location name (e.g. Home)"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isSubmitting}
            maxLength={60}
          />

          {error ? <Text className="mt-3 text-xs text-crimson">{error}</Text> : null}

          <View className={`${error ? "mt-4" : "mt-5"} flex-row gap-3`}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button
              label={isSubmitting ? "Creating..." : "Next"}
              onPress={() => void handleStep1Submit()}
              disabled={isSubmitting}
              className="flex-1"
            />
          </View>
        </>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: windowHeight * 0.45 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row flex-wrap gap-2">
              {ROOM_SUGGESTIONS.map((suggestion) => {
                const isSelected = pendingRooms.some(
                  (r) => r.toLowerCase() === suggestion.toLowerCase(),
                );
                return (
                  <Pressable
                    key={suggestion}
                    onPress={() => toggleSuggestion(suggestion)}
                    disabled={isSubmitting}
                    className={`rounded-control border px-3 py-2 ${
                      isSelected
                        ? "border-primary bg-primary/15"
                        : "border-border-default bg-bg-input/60"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-text-primary">{suggestion}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row items-center gap-2">
              <View className="flex-1">
                <FormInput
                  value={customRoomInput}
                  onChangeText={setCustomRoomInput}
                  placeholder="Custom room name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  maxLength={60}
                />
              </View>
              <Pressable
                onPress={handleAddCustomRoom}
                disabled={isSubmitting || !customRoomInput.trim()}
                className="h-[48px] w-[48px] items-center justify-center rounded-control border border-border-default bg-bg-elevated/70"
              >
                <Feather name="plus" size={18} color={iconColor} />
              </Pressable>
            </View>

            {pendingRooms.length > 0 ? (
              <View className="mt-4 gap-2">
                {pendingRooms.map((name, index) => (
                  <View
                    key={`${name}-${index}`}
                    className="flex-row items-center justify-between rounded-control border border-border-default bg-bg-input/60 px-3 py-2.5"
                  >
                    <Text className="flex-1 text-sm font-semibold text-text-primary">{name}</Text>
                    <Pressable
                      onPress={() => removeRoom(index)}
                      disabled={isSubmitting}
                      hitSlop={8}
                    >
                      <Feather name="x" size={16} color={iconColor} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {error ? <Text className="mt-3 text-xs text-crimson">{error}</Text> : null}

          <View className={`${error ? "mt-4" : "mt-5"} flex-row gap-3`}>
            <Button
              label={isSubmitting ? "Saving..." : "Skip"}
              variant="secondary"
              onPress={() => void finishCreation(locationId, [])}
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button
              label={isSubmitting ? "Saving..." : "Confirm"}
              onPress={() => void finishCreation(locationId, pendingRooms)}
              disabled={isSubmitting}
              className="flex-1"
            />
          </View>
        </>
      )}
    </AppModal>
  );
}
