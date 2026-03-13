import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { SectionHeader } from "@/components/home/section-header";
import { ItemRow, type InventoryItemRowData } from "@/components/inventory/item-row";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetaPill } from "@/components/ui/meta-pill";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { boxService, type BoxDetails, type BoxDetailsItem, type BoxSummary } from "@/lib/box.service";
import { itemService } from "@/lib/item.service";
import { locationService, type LocationSummary } from "@/lib/location.service";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditableStatus = "packed" | "unpacked";
type ItemModalMode = "create" | "edit";

const editableStatuses: { label: string; value: EditableStatus }[] = [
  { label: "Packed", value: "packed" },
  { label: "Unpacked", value: "unpacked" },
];

function getMinutesAgo(occurredAt: string, nowMs: number): number {
  const timestamp = new Date(occurredAt).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.floor((nowMs - timestamp) / (60 * 1000)));
}

function formatRelativeTime(minutesAgo: number): string {
  if (!Number.isFinite(minutesAgo) || minutesAgo < 0) {
    return "Unknown";
  }

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  if (minutesAgo < 24 * 60) {
    return `${Math.floor(minutesAgo / 60)}h ago`;
  }

  return `${Math.floor(minutesAgo / (24 * 60))}d ago`;
}

function formatUpdatedAt(isoDate: string | null): string {
  if (!isoDate) {
    return "Unknown";
  }

  return formatRelativeTime(getMinutesAgo(isoDate, Date.now()));
}

function formatStatusLabel(status: EditableStatus): "Packed" | "Unpacked" {
  return status === "packed" ? "Packed" : "Unpacked";
}

function parseQuantity(value: string): number | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
}

function mapItemToRow(item: BoxDetailsItem): InventoryItemRowData {
  return {
    id: item.id,
    title: item.name,
    subtitle: item.notes?.trim() ? item.notes : undefined,
    badgeText: item.quantity > 1 ? `x${item.quantity}` : undefined,
    icon: "package",
  };
}

export default function BoxDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; edit?: string | string[] }>();
  const hasFocusedOnceRef = useRef(false);

  const boxId = useMemo(() => {
    if (!params.id) {
      return "";
    }

    return Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  }, [params.id]);

  const shouldStartEditing = useMemo(() => {
    if (!params.edit) {
      return false;
    }

    const rawValue = Array.isArray(params.edit) ? params.edit[0] : params.edit;
    return rawValue === "1" || rawValue?.toLowerCase() === "true";
  }, [params.edit]);

  const [box, setBox] = useState<BoxDetails | null>(null);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState<BoxSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(shouldStartEditing);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedLocationId, setEditedLocationId] = useState("");
  const [editedStatus, setEditedStatus] = useState<EditableStatus>("unpacked");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<ItemModalMode>("create");
  const [activeItemId, setActiveItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNotes, setItemNotes] = useState("");
  const [editedItemBoxId, setEditedItemBoxId] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemModalError, setItemModalError] = useState<string | null>(null);

  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<BoxDetailsItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);

  const loadBox = useCallback(
    async (refresh: boolean) => {
      if (!boxId) {
        setErrorMessage("Box id is missing.");
        setBox(null);
        setLocations([]);
        setAvailableBoxes([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [boxDetails, locationList, boxList] = await Promise.all([
          boxService.getBoxDetails(boxId),
          locationService.listLocationSummaries(),
          boxService.listBoxes(),
        ]);
        setBox(boxDetails);
        setLocations(locationList);
        setAvailableBoxes(boxList);
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load box.";
        setErrorMessage(message);
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [boxId],
  );

  useEffect(() => {
    void loadBox(false);
  }, [loadBox]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadBox(true);
    }, [loadBox]),
  );

  useEffect(() => {
    setIsEditModalOpen(shouldStartEditing);
  }, [shouldStartEditing, boxId]);

  useEffect(() => {
    if (!box) {
      return;
    }

    setEditedName(box.name);
    setEditedLocationId(box.locationId);
    setEditedStatus(box.status);
  }, [box]);

  const saveBox = useCallback(async () => {
    if (!box) {
      return;
    }

    const normalizedName = editedName.trim();
    if (!normalizedName) {
      setSaveError("Box name is required.");
      return;
    }

    if (!editedLocationId) {
      setSaveError("Room is required.");
      return;
    }

    if (
      normalizedName === box.name &&
      editedLocationId === box.locationId &&
      editedStatus === box.status
    ) {
      setSaveError(null);
      setIsEditModalOpen(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await boxService.updateBox(box.id, {
        name: normalizedName,
        locationId: editedLocationId,
        status: editedStatus,
      });
      setIsEditModalOpen(false);
      await loadBox(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update box.";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [box, editedLocationId, editedName, editedStatus, loadBox]);

  const openEditModal = useCallback(() => {
    if (!box) {
      return;
    }

    setEditedName(box.name);
    setEditedLocationId(box.locationId);
    setEditedStatus(box.status);
    setSaveError(null);
    setIsEditModalOpen(true);
  }, [box]);

  const closeEditModal = useCallback(() => {
    if (isSaving || !box) {
      return;
    }

    setEditedName(box.name);
    setEditedLocationId(box.locationId);
    setEditedStatus(box.status);
    setSaveError(null);
    setIsEditModalOpen(false);
  }, [box, isSaving]);

  const openDeleteModal = useCallback(() => {
    if (!box) {
      return;
    }

    setDeleteError(null);
    setIsDeleteModalOpen(true);
  }, [box]);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setIsDeleteModalOpen(false);
    setDeleteError(null);
  }, [isDeleting]);

  const deleteBox = useCallback(async () => {
    if (!box) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await boxService.deleteBox(box.id);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/inventory");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete box.";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [box, router]);

  const openCreateItemModal = useCallback(() => {
    if (!box) {
      return;
    }

    setItemModalMode("create");
    setActiveItemId("");
    setItemName("");
    setItemQuantity("1");
    setItemNotes("");
    setEditedItemBoxId(box.id);
    setItemModalError(null);
    setIsItemModalOpen(true);
  }, [box]);

  const openEditItemModal = useCallback(
    (item: BoxDetailsItem) => {
      if (!box) {
        return;
      }

      setItemModalMode("edit");
      setActiveItemId(item.id);
      setItemName(item.name);
      setItemQuantity(String(item.quantity));
      setItemNotes(item.notes ?? "");
      setEditedItemBoxId(box.id);
      setItemModalError(null);
      setIsItemModalOpen(true);
    },
    [box],
  );

  const closeItemModal = useCallback(() => {
    if (isSavingItem) {
      return;
    }

    setIsItemModalOpen(false);
    setItemModalError(null);
  }, [isSavingItem]);

  const saveItem = useCallback(async () => {
    if (!box) {
      return;
    }

    const normalizedName = itemName.trim();
    if (!normalizedName) {
      setItemModalError("Item name is required.");
      return;
    }

    const parsedQuantity = parseQuantity(itemQuantity);
    if (!parsedQuantity) {
      setItemModalError("Quantity must be a whole number greater than 0.");
      return;
    }

    if (itemModalMode === "edit" && !editedItemBoxId) {
      setItemModalError("Box is required.");
      return;
    }

    setIsSavingItem(true);
    setItemModalError(null);

    try {
      if (itemModalMode === "create") {
        await itemService.createItem({
          name: normalizedName,
          quantity: parsedQuantity,
          notes: itemNotes,
          boxId: box.id,
        });
      } else {
        if (!activeItemId) {
          throw new Error("Item id is missing.");
        }

        await itemService.updateItem(activeItemId, {
          name: normalizedName,
          quantity: parsedQuantity,
          notes: itemNotes,
          boxId: editedItemBoxId,
        });
      }

      setIsItemModalOpen(false);
      await loadBox(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save item.";
      setItemModalError(message);
    } finally {
      setIsSavingItem(false);
    }
  }, [activeItemId, box, editedItemBoxId, itemModalMode, itemName, itemNotes, itemQuantity, loadBox]);

  const openDeleteItemModal = useCallback((item: BoxDetailsItem) => {
    setDeleteItemError(null);
    setItemPendingDelete(item);
    setIsDeleteItemModalOpen(true);
  }, []);

  const closeDeleteItemModal = useCallback(() => {
    if (isDeletingItem) {
      return;
    }

    setIsDeleteItemModalOpen(false);
    setDeleteItemError(null);
    setItemPendingDelete(null);
  }, [isDeletingItem]);

  const deleteItem = useCallback(async () => {
    if (!itemPendingDelete) {
      return;
    }

    setIsDeletingItem(true);
    setDeleteItemError(null);

    try {
      await itemService.deleteItem(itemPendingDelete.id);
      setIsDeleteItemModalOpen(false);
      setItemPendingDelete(null);
      await loadBox(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete item.";
      setDeleteItemError(message);
    } finally {
      setIsDeletingItem(false);
    }
  }, [itemPendingDelete, loadBox]);

  if (isLoading && !box) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
          >
            <Feather name="arrow-left" size={18} color={Colors.dark.textPrimary} />
          </Pressable>
          <Text className="text-base font-semibold text-text-primary">Box Details</Text>
          <View className="h-10 w-10" />
        </View>

        {errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => void loadBox(true)}
            className="mt-6"
          />
        ) : null}

        {box ? (
          <>
            <View className="mt-6 rounded-card border border-border-default bg-bg-elevated/70 p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                      <Feather name="archive" size={18} color={Colors.dark.primary} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-lg font-bold text-text-primary">{box.name}</Text>
                      <View className="mt-1 flex-row items-center">
                        <Feather name="map-pin" size={12} color={Colors.dark.textTertiary} />
                        <Text className="ml-1 text-xs text-text-tertiary">{box.locationName}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={openEditModal}
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                    disabled={isDeleting}
                  >
                    <Feather name="edit-2" size={18} color={Colors.dark.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={openDeleteModal}
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
                    disabled={isDeleting}
                  >
                    <Feather name="trash-2" size={18} color={Colors.dark.crimson} />
                  </Pressable>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View
                  className={`min-h-[24px] items-center justify-center rounded-full px-3 py-1 ${
                    box.status === "packed" ? "bg-emerald/20" : "bg-crimson/20"
                  }`}
                >
                  <Text
                    className={`text-center text-xs font-semibold leading-[14px] ${
                      box.status === "packed" ? "text-emerald" : "text-crimson"
                    }`}
                  >
                    {formatStatusLabel(box.status)}
                  </Text>
                </View>
                <MetaPill icon="clock" text={`Updated ${formatUpdatedAt(box.updatedAt)}`} />
              </View>
            </View>

            <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
              <MetricCard
                label="Items"
                value={String(box.itemsCount)}
                style={{ width: "48.5%" }}
              />
              <MetricCard
                label="Fragile"
                value={box.isFragile ? "Yes" : "No"}
                style={{ width: "48.5%" }}
              />
            </View>

            <View className="mt-6">
              <SectionHeader title="Items in this box" actionLabel="Add Item" onPressAction={openCreateItemModal} />
              <View className="mt-3 gap-3">
                {box.items.length > 0 ? (
                  box.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={mapItemToRow(item)}
                      onPressEdit={() => openEditItemModal(item)}
                      onPressDelete={() => openDeleteItemModal(item)}
                    />
                  ))
                ) : (
                  <EmptyStateCard
                    title="No items yet"
                    description="Add your first item to this box."
                  />
                )}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <AppModal
        visible={isItemModalOpen}
        title={itemModalMode === "create" ? "Add item" : "Edit item"}
        description={
          itemModalMode === "create"
            ? "Create a new item for this box."
            : "Update item details and assigned box."
        }
        onRequestClose={closeItemModal}
        maxWidth={420}
      >
        <FormInput
          value={itemName}
          onChangeText={setItemName}
          placeholder="Item name"
          autoCapitalize="sentences"
          autoCorrect={false}
          editable={!isSavingItem}
          maxLength={120}
        />

        <View className="mt-4">
          <FormInput
            value={itemQuantity}
            onChangeText={setItemQuantity}
            placeholder="Quantity"
            keyboardType="number-pad"
            editable={!isSavingItem}
            maxLength={4}
          />
        </View>

        <View className="mt-4">
          <FormInput
            value={itemNotes}
            onChangeText={setItemNotes}
            placeholder="Notes (optional)"
            autoCapitalize="sentences"
            editable={!isSavingItem}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 84, paddingTop: 12 }}
            maxLength={300}
          />
        </View>

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Box</Text>
          <View className="mt-2 gap-2">
            {itemModalMode === "create" && box ? (
              <View className="rounded-control border border-primary bg-primary/15 px-3 py-2.5">
                <Text className="text-sm font-semibold text-text-primary">{box.name}</Text>
                <Text className="mt-1 text-xs text-text-tertiary">{box.locationName}</Text>
              </View>
            ) : availableBoxes.length > 0 ? (
              availableBoxes.map((availableBox) => {
                const isActive = availableBox.id === editedItemBoxId;
                return (
                  <Pressable
                    key={availableBox.id}
                    onPress={() => setEditedItemBoxId(availableBox.id)}
                    disabled={isSavingItem}
                    className={`rounded-control border px-3 py-2.5 ${
                      isActive
                        ? "border-primary bg-primary/15"
                        : "border-border-default bg-bg-input/60"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-text-primary">{availableBox.name}</Text>
                    <Text className="mt-1 text-xs text-text-tertiary">{availableBox.locationName}</Text>
                  </Pressable>
                );
              })
            ) : (
              <Text className="text-xs text-text-tertiary">No boxes available.</Text>
            )}
          </View>
        </View>

        {itemModalError ? (
          <Text className="mt-3 text-xs text-crimson">{itemModalError}</Text>
        ) : null}

        <View className={`${itemModalError ? "mt-4" : "mt-5"} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeItemModal}
            disabled={isSavingItem}
            className="flex-1"
          />
          <Button
            label={isSavingItem ? "Saving..." : itemModalMode === "create" ? "Create" : "Save"}
            onPress={() => void saveItem()}
            disabled={isSavingItem}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isEditModalOpen}
        title="Edit box"
        description="Update box name, room, and status."
        onRequestClose={closeEditModal}
        maxWidth={420}
      >
        <FormInput
          value={editedName}
          onChangeText={setEditedName}
          placeholder="Box name"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isSaving}
          maxLength={80}
        />

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Room</Text>
          <View className="mt-2 gap-2">
            {locations.length > 0 ? (
              locations.map((location) => {
                const isActive = location.id === editedLocationId;
                return (
                  <Pressable
                    key={location.id}
                    onPress={() => setEditedLocationId(location.id)}
                    disabled={isSaving}
                    className={`rounded-control border px-3 py-2.5 ${
                      isActive
                        ? "border-primary bg-primary/15"
                        : "border-border-default bg-bg-input/60"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-text-primary">{location.name}</Text>
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
                  onPress={() => setEditedStatus(option.value)}
                  disabled={isSaving}
                  className={`flex-1 items-center rounded-control border py-2.5 ${
                    isActive
                      ? "border-primary bg-primary/15"
                      : "border-border-default bg-bg-input/60"
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
            onPress={closeEditModal}
            disabled={isSaving}
            className="flex-1"
          />
          <Button
            label={isSaving ? "Saving..." : "Save"}
            onPress={() => void saveBox()}
            disabled={isSaving}
            className="flex-1"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isDeleteItemModalOpen}
        title="Delete item?"
        description={
          itemPendingDelete
            ? `Delete "${itemPendingDelete.name}" permanently.`
            : "Delete this item permanently."
        }
        onRequestClose={closeDeleteItemModal}
        maxWidth={420}
      >
        {deleteItemError ? <Text className="text-xs text-crimson">{deleteItemError}</Text> : null}

        <View className={`${deleteItemError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeDeleteItemModal}
            disabled={isDeletingItem}
            className="flex-1"
          />
          <Button
            label={isDeletingItem ? "Deleting..." : "Delete"}
            variant="secondary"
            onPress={() => void deleteItem()}
            disabled={isDeletingItem}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>

      <AppModal
        visible={isDeleteModalOpen}
        title="Delete box?"
        description={
          box
            ? `Delete "${box.name}" permanently. Deletion is blocked if the box still has items.`
            : "Delete this box permanently."
        }
        onRequestClose={closeDeleteModal}
        maxWidth={420}
      >
        {deleteError ? <Text className="text-xs text-crimson">{deleteError}</Text> : null}

        <View className={`${deleteError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeDeleteModal}
            disabled={isDeleting}
            className="flex-1"
          />
          <Button
            label={isDeleting ? "Deleting..." : "Delete"}
            variant="secondary"
            onPress={() => void deleteBox()}
            disabled={isDeleting}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
