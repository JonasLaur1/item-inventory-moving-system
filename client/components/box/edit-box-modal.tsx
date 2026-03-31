import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { AppModal } from "@/components/ui/app-modal";
import { type RoomSummary } from "@/lib/room.service";
import { editableStatuses, type EditableStatus } from "@/utils/box-detail-utils";
import { Pressable, Text, View } from "react-native";

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
  return (
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
        <View className="mt-2 gap-2">
          {rooms.length > 0 ? (
            rooms.map((room) => {
              const isActive = room.id === editedRoomId;
              return (
                <Pressable
                  key={room.id}
                  onPress={() => onRoomChange(room.id)}
                  disabled={isSaving}
                  className={`rounded-control border px-3 py-2.5 ${
                    isActive ? "border-primary bg-primary/15" : "border-border-default bg-bg-input/60"
                  }`}
                >
                  <Text className="text-sm font-semibold text-text-primary">{room.name}</Text>
                  <Text className="mt-1 text-xs text-text-tertiary">{room.locationName}</Text>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-xs text-text-tertiary">No rooms available.</Text>
          )}
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
  );
}
