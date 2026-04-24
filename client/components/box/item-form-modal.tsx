import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { AppModal } from "@/components/ui/app-modal";
import { Colors } from "@/constants/theme";
import { type BoxDetails, type BoxSummary } from "@/lib/box.service";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

type ItemFormModalProps = {
  visible: boolean;
  mode: "create" | "edit";
  box: BoxDetails | null;
  availableBoxes: BoxSummary[];
  selectedBoxForDisplay: BoxSummary | null;
  isBoxPickerOpen: boolean;
  capturedPhotoUri: string | null;
  existingPhotoUrl: string | null;
  photoMarkedForRemoval: boolean;
  isNameAiSuggested: boolean;
  name: string;
  quantity: string;
  isFragile: boolean;
  notes: string;
  isSaving: boolean;
  error: string | null;
  windowHeight: number;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (text: string) => void;
  onQuantityChange: (text: string) => void;
  onFragileChange: (value: boolean) => void;
  onNotesChange: (text: string) => void;
  onOpenCamera: () => void;
  onRemovePhoto: () => void;
  onMarkPhotoForRemoval: () => void;
  onOpenBoxPicker: () => void;
  onCloseBoxPicker: () => void;
  onSelectBox: (boxId: string) => void;
};

export function ItemFormModal({
  visible,
  mode,
  box,
  availableBoxes,
  selectedBoxForDisplay,
  isBoxPickerOpen,
  capturedPhotoUri,
  existingPhotoUrl,
  photoMarkedForRemoval,
  isNameAiSuggested,
  name,
  quantity,
  isFragile,
  notes,
  isSaving,
  error,
  windowHeight,
  onClose,
  onSave,
  onNameChange,
  onQuantityChange,
  onFragileChange,
  onNotesChange,
  onOpenCamera,
  onRemovePhoto,
  onMarkPhotoForRemoval,
  onOpenBoxPicker,
  onCloseBoxPicker,
  onSelectBox,
}: ItemFormModalProps) {
  const { t } = useTranslation();
  return (
    <>
      <AppModal
        visible={visible}
        title={mode === "create" ? t("modals.addItemTitle") : t("modals.editItemTitle")}
        description={
          mode === "create" ? t("modals.addItemDesc") : t("modals.editItemDesc")
        }
        onRequestClose={onClose}
        maxWidth={420}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: windowHeight * 0.62 }}
        >
          {capturedPhotoUri ? (
            <View className="mb-4 flex-row items-center gap-3 rounded-card border border-border-default bg-bg-elevated/70 p-3">
              <Image
                source={{ uri: capturedPhotoUri }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
                contentFit="cover"
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text-primary">{t("addItem.photoAttached")}</Text>
                {isNameAiSuggested ? (
                  <Text className="mt-0.5 text-xs text-primary">{t("addItem.aiSuggestionApplied")}</Text>
                ) : (
                  <Text className="mt-0.5 text-xs text-text-tertiary">{t("addItem.willBeSaved")}</Text>
                )}
              </View>
              <Pressable
                onPress={onRemovePhoto}
                disabled={isSaving}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-input"
              >
                <Feather name="x" size={14} color={Colors.dark.textTertiary} />
              </Pressable>
            </View>
          ) : existingPhotoUrl && !photoMarkedForRemoval ? (
            <View className="mb-4 flex-row items-center gap-3 rounded-card border border-border-default bg-bg-elevated/70 p-3">
              <Image
                source={{ uri: existingPhotoUrl }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
                contentFit="cover"
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text-primary">{t("addItem.photoAttached")}</Text>
                <Pressable hitSlop={8} onPress={onOpenCamera} disabled={isSaving}>
                  <Text className="mt-0.5 text-xs text-primary">{t("modals.tapToReplace")}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={onMarkPhotoForRemoval}
                disabled={isSaving}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-input"
              >
                <Feather name="x" size={14} color={Colors.dark.textTertiary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onOpenCamera}
              disabled={isSaving}
              className="mb-4 flex-row items-center gap-3 rounded-card border border-border-default bg-bg-elevated/70 p-3"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Feather name="camera" size={16} color={Colors.dark.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text-primary">{t("addItem.takePhoto")}</Text>
                <Text className="mt-0.5 text-xs text-text-tertiary">
                  {mode === "create" ? t("addItem.aiWillIdentify") : t("modals.addPhotoToItem")}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={Colors.dark.textTertiary} />
            </Pressable>
          )}

          <FormInput
            value={name}
            onChangeText={onNameChange}
            placeholder={t("addItem.itemName")}
            autoCapitalize="sentences"
            autoCorrect={false}
            editable={!isSaving}
            maxLength={120}
          />
          {isNameAiSuggested ? <Text className="mt-1 text-xs text-primary">{t("addItem.aiSuggested")}</Text> : null}

          <View className="mt-4">
            <FormInput
              value={quantity}
              onChangeText={onQuantityChange}
              placeholder={t("addItem.quantity")}
              keyboardType="number-pad"
              editable={!isSaving}
              maxLength={4}
            />
          </View>

          <View className="mt-4">
            <FormInput
              value={notes}
              onChangeText={onNotesChange}
              placeholder={t("addItem.notesOptional")}
              autoCapitalize="sentences"
              editable={!isSaving}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 84, paddingTop: 12 }}
              maxLength={300}
            />
          </View>

          <View className="mt-4">
            <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">{t("addItem.fragility")}</Text>
            <View className="mt-2 flex-row gap-2">
              <Pressable
                onPress={() => onFragileChange(false)}
                disabled={isSaving}
                className={`flex-1 items-center rounded-control border py-2.5 ${
                  !isFragile ? "border-primary bg-primary/15" : "border-border-default bg-bg-input/60"
                }`}
              >
                <Text className="text-sm font-semibold text-text-primary">{t("addItem.notFragile")}</Text>
              </Pressable>
              <Pressable
                onPress={() => onFragileChange(true)}
                disabled={isSaving}
                className={`flex-1 items-center rounded-control border py-2.5 ${
                  isFragile ? "border-primary bg-primary/15" : "border-border-default bg-bg-input/60"
                }`}
              >
                <Text className="text-sm font-semibold text-text-primary">{t("addItem.fragile")}</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">{t("addItem.box")}</Text>
            <View className="mt-2">
              {mode === "create" && box ? (
                <View className="rounded-control border border-primary bg-primary/15 px-3 py-2.5">
                  <Text className="text-sm font-semibold text-text-primary">{box.name}</Text>
                  <Text className="mt-1 text-xs text-text-tertiary">
                    {box.parentLocationName} / {box.roomName}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={onOpenBoxPicker}
                  disabled={isSaving}
                  className="flex-row items-center justify-between rounded-control border border-border-default bg-bg-input/60 px-3 py-2.5"
                >
                  <View className="flex-1">
                    {selectedBoxForDisplay ? (
                      <>
                        <Text className="text-sm font-semibold text-text-primary">
                          {selectedBoxForDisplay.name}
                        </Text>
                        <Text className="mt-0.5 text-xs text-text-tertiary">
                          {selectedBoxForDisplay.parentLocationName} / {selectedBoxForDisplay.roomName}
                        </Text>
                      </>
                    ) : (
                      <Text className="text-sm text-text-tertiary">{t("modals.selectBox")}</Text>
                    )}
                  </View>
                  <Feather name="chevron-down" size={16} color={Colors.dark.textTertiary} />
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>

        {error ? <Text className="mt-3 text-xs text-crimson">{error}</Text> : null}

        <View className={`${error ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={onClose}
            disabled={isSaving}
            className="flex-1"
          />
          <Button
            label={isSaving ? t("common.saving") : mode === "create" ? t("common.create") : t("common.save")}
            onPress={onSave}
            disabled={isSaving}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isBoxPickerOpen}
        title={t("modals.selectBoxTitle")}
        onRequestClose={onCloseBoxPicker}
        closeOnBackdropPress
        showCornerClose
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: windowHeight * 0.5 }}>
          {availableBoxes.length > 0 ? (
            availableBoxes
              .reduce<{ locationName: string; boxes: typeof availableBoxes }[]>((groups, box) => {
                const existing = groups.find((g) => g.locationName === box.parentLocationName);
                if (existing) {
                  existing.boxes.push(box);
                } else {
                  groups.push({ locationName: box.parentLocationName, boxes: [box] });
                }
                return groups;
              }, [])
              .map((group, groupIndex) => (
                <View key={group.locationName} className={groupIndex > 0 ? "mt-4" : ""}>
                  <Text className="mb-2 text-xs uppercase tracking-[1px] text-text-tertiary">
                    {group.locationName}
                  </Text>
                  {group.boxes.map((availableBox, index) => {
                    const isActive = availableBox.id === selectedBoxForDisplay?.id;
                    return (
                      <Pressable
                        key={availableBox.id}
                        onPress={() => onSelectBox(availableBox.id)}
                        className={`rounded-control border px-3 py-2.5 ${index > 0 ? "mt-2" : ""} ${
                          isActive ? "border-primary bg-primary/15" : "border-border-default bg-bg-input/60"
                        }`}
                      >
                        <Text className="text-sm font-semibold text-text-primary">{availableBox.name}</Text>
                        <Text className="mt-0.5 text-xs text-text-tertiary">{availableBox.roomName}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))
          ) : (
            <Text className="text-sm text-text-tertiary">{t("modals.noBoxesAvailable")}</Text>
          )}
        </ScrollView>
      </AppModal>
    </>
  );
}
