import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { ColorPalettes } from "@/constants/theme";
import { useBoxes } from "@/hooks/use-boxes";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { itemService } from "@/lib/item.service";
import { type BoxSummary } from "@/lib/box.service";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RoomGroup = { roomName: string; boxes: BoxSummary[] };
type LocationGroup = { locationName: string; rooms: RoomGroup[] };

function groupBoxes(boxes: BoxSummary[]): LocationGroup[] {
  const locationMap = new Map<string, Map<string, BoxSummary[]>>();

  for (const box of boxes) {
    if (!locationMap.has(box.parentLocationId)) {
      locationMap.set(box.parentLocationId, new Map());
    }
    const roomMap = locationMap.get(box.parentLocationId)!;
    if (!roomMap.has(box.roomId)) {
      roomMap.set(box.roomId, []);
    }
    roomMap.get(box.roomId)!.push(box);
  }

  return Array.from(locationMap.entries()).map(([, roomMap]) => {
    const firstBox = Array.from(roomMap.values())[0][0];
    return {
      locationName: firstBox.parentLocationName,
      rooms: Array.from(roomMap.entries()).map(([, roomBoxes]) => ({
        roomName: roomBoxes[0].roomName,
        boxes: roomBoxes,
      })),
    };
  });
}

function parseQuantity(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

export default function AddItemScreen() {
  const { resolvedTheme } = useThemePreference();
  const palette = ColorPalettes[resolvedTheme];

  const { boxes, isLoading: isBoxesLoading } = useBoxes();
  const groupedBoxes = useMemo(() => groupBoxes(boxes), [boxes]);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isFragile, setIsFragile] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Item name is required.");
      return;
    }

    const parsedQuantity = parseQuantity(quantity);
    if (!parsedQuantity) {
      setError("Quantity must be a whole number greater than 0.");
      return;
    }

    if (!selectedBoxId) {
      setError("Box is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await itemService.createItem({
        name: normalizedName,
        quantity: parsedQuantity,
        isFragile,
        notes: notes.trim() || null,
        boxId: selectedBoxId,
      });

      router.replace("/(tabs)/inventory");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create item.";
      setError(message);
      setIsSubmitting(false);
    }
  }, [name, quantity, isFragile, notes, selectedBoxId]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-bg-base">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold text-text-primary">Add Item</Text>
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-card border border-border-strong bg-bg-input"
        >
          <Feather name="x" size={18} color={palette.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormInput
          value={name}
          onChangeText={setName}
          placeholder="Item name"
          autoCapitalize="sentences"
          autoCorrect={false}
          editable={!isSubmitting}
          maxLength={120}
        />

        <View className="mt-4">
          <FormInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Quantity"
            keyboardType="number-pad"
            editable={!isSubmitting}
            maxLength={4}
          />
        </View>

        <View className="mt-4">
          <FormInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            autoCapitalize="sentences"
            editable={!isSubmitting}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 84, paddingTop: 12 }}
            maxLength={300}
          />
        </View>

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Fragility</Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={() => setIsFragile(false)}
              disabled={isSubmitting}
              className={`flex-1 items-center rounded-control border py-2.5 ${
                !isFragile
                  ? "border-primary bg-primary/15"
                  : "border-border-default bg-bg-input/60"
              }`}
            >
              <Text className="text-sm font-semibold text-text-primary">Not fragile</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsFragile(true)}
              disabled={isSubmitting}
              className={`flex-1 items-center rounded-control border py-2.5 ${
                isFragile
                  ? "border-primary bg-primary/15"
                  : "border-border-default bg-bg-input/60"
              }`}
            >
              <Text className="text-sm font-semibold text-text-primary">Fragile</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Box</Text>
          <View className="mt-2 gap-4">
            {isBoxesLoading ? (
              <Text className="text-xs text-text-tertiary">Loading boxes...</Text>
            ) : boxes.length === 0 ? (
              <Text className="text-xs text-text-tertiary">
                No boxes found. Create a box first before adding items.
              </Text>
            ) : (
              groupedBoxes.map((location) => (
                <View key={location.locationName}>
                  <Text className="mb-2 text-sm font-bold text-text-primary">
                    {location.locationName}
                  </Text>
                  {location.rooms.map((room) => (
                    <View key={room.roomName} className="mb-3">
                      <Text className="mb-1.5 text-xs uppercase tracking-[1px] text-text-tertiary">
                        {room.roomName}
                      </Text>
                      <View className="gap-2">
                        {room.boxes.map((box) => {
                          const isActive = box.id === selectedBoxId;
                          return (
                            <Pressable
                              key={box.id}
                              onPress={() => setSelectedBoxId(box.id)}
                              disabled={isSubmitting}
                              className={`rounded-control border px-3 py-2.5 ${
                                isActive
                                  ? "border-primary bg-primary/15"
                                  : "border-border-default bg-bg-input/60"
                              }`}
                            >
                              <Text className="text-sm font-semibold text-text-primary">
                                {box.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </View>

        {error ? (
          <Text className="mt-3 text-xs text-crimson">{error}</Text>
        ) : null}

        <View className={`${error ? "mt-4" : "mt-6"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            disabled={isSubmitting}
            className="flex-1"
          />
          <Button
            label={isSubmitting ? "Creating..." : "Create"}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting || boxes.length === 0}
            className="flex-1"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
