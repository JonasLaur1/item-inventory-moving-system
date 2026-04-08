import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { AppModal } from "@/components/ui/app-modal";
import { Colors } from "@/constants/theme";
import { type RoomSummary } from "@/lib/room.service";
import { editableStatuses, type EditableStatus } from "@/utils/box-detail-utils";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useState } from "react";

type EditBoxModalProps = {
  visible: boolean;
  rooms: RoomSummary[];
  editedName: string;
  editedRoomId: string;
  editedStatus: EditableStatus;
  isSaving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (name: string) => void;
  onRoomChange: (roomId: string) => void;
  onStatusChange: (status: EditableStatus) => void;
};

export function EditBoxModal({
  visible,
  rooms,
  editedName,
  editedRoomId,
  editedStatus,
  isSaving,
  saveError,
  onClose,
  onSave,
  onNameChange,
  onRoomChange,
  onStatusChange,
}: EditBoxModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const { resolvedTheme } = useThemePreference();
  const colors = Colors[resolvedTheme];

  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === editedRoomId) ?? null;

  const roomsByLocation = rooms.reduce<{ locationName: string; rooms: RoomSummary[] }[]>((groups, room) => {
    const existing = groups.find((g) => g.locationName === room.locationName);
    if (existing) {
      existing.rooms.push(room);
    } else {
      groups.push({ locationName: room.locationName, rooms: [room] });
    }
    return groups;
  }, []);

  return (
    <>
      <AppModal
        visible={visible}
        title="Edit box"
        description="Update box name, room, and status."
        onRequestClose={onClose}
        maxWidth={420}
      >
        <FormInput
          value={editedName}
          onChangeText={onNameChange}
          placeholder="Box name"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isSaving}
          maxLength={80}
        />

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Room</Text>
          <View className="mt-2">
            <Pressable
              onPress={() => setIsRoomPickerOpen(true)}
              disabled={isSaving}
              className="flex-row items-center justify-between rounded-control border border-border-default bg-bg-input/60 px-3 py-2.5"
            >
              <View className="flex-1">
                {selectedRoom ? (
                  <>
                    <Text className="text-sm font-semibold text-text-primary">{selectedRoom.name}</Text>
                    <Text className="mt-0.5 text-xs text-text-tertiary">{selectedRoom.locationName}</Text>
                  </>
                ) : (
                  <Text className="text-sm text-text-tertiary">Select a room...</Text>
                )}
              </View>
              <Feather name="chevron-down" size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Status</Text>
          <View className="mt-2 flex-row gap-2">
            {editableStatuses.map((option) => {
              const isActive = option.value === editedStatus;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onStatusChange(option.value)}
                  disabled={isSaving}
                  className={`flex-1 items-center rounded-control border py-2.5 ${
                    isActive ? "border-primary bg-primary/15" : "border-border-default bg-bg-input/60"
                  }`}
                >
                  <Text className="text-sm font-semibold text-text-primary">{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {saveError ? <Text className="mt-3 text-xs text-crimson">{saveError}</Text> : null}

        <View className={`${saveError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={onClose}
            disabled={isSaving}
            className="flex-1"
          />
          <Button
            label={isSaving ? "Saving..." : "Save"}
            onPress={onSave}
            disabled={isSaving}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isRoomPickerOpen}
        title="Select Room"
        onRequestClose={() => setIsRoomPickerOpen(false)}
        closeOnBackdropPress
        showCornerClose
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: windowHeight * 0.5 }}>
          {roomsByLocation.length > 0 ? (
            roomsByLocation.map((group, groupIndex) => (
              <View key={group.locationName} className={groupIndex > 0 ? "mt-4" : ""}>
                <Text className="mb-2 text-xs uppercase tracking-[1px] text-text-tertiary">
                  {group.locationName}
                </Text>
                {group.rooms.map((room, index) => {
                  const isActive = room.id === editedRoomId;
                  return (
                    <Pressable
                      key={room.id}
                      onPress={() => {
                        onRoomChange(room.id);
                        setIsRoomPickerOpen(false);
                      }}
                      className={`rounded-control border px-3 py-2.5 ${index > 0 ? "mt-2" : ""} ${
                        isActive ? "border-primary bg-primary/15" : "border-border-default bg-bg-input/60"
                      }`}
                    >
                      <Text className="text-sm font-semibold text-text-primary">{room.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))
          ) : (
            <Text className="text-sm text-text-tertiary">No rooms available.</Text>
          )}
        </ScrollView>
      </AppModal>
    </>
  );
}
