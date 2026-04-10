import { Button } from "@/components/button";
import { DeleteConfirmationModal } from "@/components/box/delete-confirmation-modal";
import { DeliveryModal } from "@/components/box/delivery-modal";
import { EditBoxModal } from "@/components/box/edit-box-modal";
import { ItemFormModal } from "@/components/box/item-form-modal";
import { QrModal } from "@/components/box/qr-modal";
import { UnpackModal } from "@/components/box/unpack-modal";
import { SectionHeader } from "@/components/ui/section-header";
import { ItemRow } from "@/components/inventory/item-row";
import { CameraCaptureModal } from "@/components/ui/camera-capture-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MetaPill } from "@/components/ui/meta-pill";
import { MetricCard } from "@/components/ui/metric-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { useBluetoothPrinter } from "@/hooks/use-bluetooth-printer";
import { useBoxModal } from "@/hooks/use-box-modal";
import { useBoxQr } from "@/hooks/use-box-qr";
import { useItemModal } from "@/hooks/use-item-modal";
import { useMovingMode } from "@/hooks/use-moving-mode";
import { boxService, type BoxDetails, type BoxSummary } from "@/lib/box.service";
import { roomService, type RoomSummary } from "@/lib/room.service";
import { formatStatusLabel, formatUpdatedAt, mapItemToRow } from "@/utils/box-detail-utils";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BoxDetailsScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[]; edit?: string | string[]; delivery?: string | string[] }>();
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

  const shouldPromptDelivery = useMemo(() => {
    if (!params.delivery) {
      return false;
    }

    const rawValue = Array.isArray(params.delivery) ? params.delivery[0] : params.delivery;
    return rawValue === "1";
  }, [params.delivery]);

  const [box, setBox] = useState<BoxDetails | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState<BoxSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const [isUnpackModalOpen, setIsUnpackModalOpen] = useState(false);
  const [isMarkingUnpacked, setIsMarkingUnpacked] = useState(false);
  const [unpackError, setUnpackError] = useState<string | null>(null);

  const loadBox = useCallback(
    async (refresh: boolean) => {
      if (!boxId) {
        setErrorMessage("Box id is missing.");
        setBox(null);
        setRooms([]);
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
        const [boxDetails, roomList, boxList] = await Promise.all([
          boxService.getBoxDetails(boxId),
          roomService.listRoomSummaries(),
          boxService.listBoxes(),
        ]);
        setBox(boxDetails);
        setRooms(roomList);
        setAvailableBoxes(boxList);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load box.");
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

  const refresh = useCallback(() => loadBox(true), [loadBox]);

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

  const { toLocationId } = useMovingMode();
  const boxModal = useBoxModal({ box, onRefresh: refresh });
  const itemModal = useItemModal({ box, availableBoxes, onRefresh: refresh });
  const qr = useBoxQr(box);
  const btPrinter = useBluetoothPrinter();

  useEffect(() => {
    if (shouldPromptDelivery && box && !isLoading) {
      setIsDeliveryModalOpen(true);
    }
  }, [shouldPromptDelivery, box, isLoading]);

  useEffect(() => {
    boxModal.setIsEditModalOpen(shouldStartEditing);
  }, [shouldStartEditing, boxId]);

  const confirmDelivery = useCallback(async () => {
    if (!boxId) {
      return;
    }

    setIsMarkingDelivered(true);
    setDeliveryError(null);

    try {
      await boxService.markBoxDelivered(boxId, toLocationId);
      setIsDeliveryModalOpen(false);
      await refresh();
      setIsUnpackModalOpen(true);
    } catch {
      setDeliveryError("Failed to mark as delivered. Please try again.");
    } finally {
      setIsMarkingDelivered(false);
    }
  }, [boxId, toLocationId, refresh]);

  const confirmUnpackAtDestination = useCallback(async () => {
    if (!boxId) {
      return;
    }

    setIsMarkingUnpacked(true);
    setUnpackError(null);

    try {
      await boxService.markBoxUnpackedAtDestination(boxId);
      setIsUnpackModalOpen(false);
      void refresh();
    } catch {
      setUnpackError("Failed to update box status. Please try again.");
    } finally {
      setIsMarkingUnpacked(false);
    }
  }, [boxId, refresh]);

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
                        <Text className="ml-1 text-xs text-text-tertiary">
                          {box.parentLocationName} / {box.roomName}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={qr.openQrModal}
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                    disabled={boxModal.isDeleting}
                  >
                    <MaterialCommunityIcons name="qrcode" size={20} color={Colors.dark.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={boxModal.openEditModal}
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                    disabled={boxModal.isDeleting}
                  >
                    <Feather name="edit-2" size={18} color={Colors.dark.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={boxModal.openDeleteModal}
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
                    disabled={boxModal.isDeleting}
                  >
                    <Feather name="trash-2" size={18} color={Colors.dark.crimson} />
                  </Pressable>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View
                  className={`min-h-[24px] items-center justify-center rounded-full px-3 py-1 ${
                    box.status === "packed"
                      ? "bg-emerald/20"
                      : box.status === "delivered" || box.status === "unpacked_at_destination"
                        ? "bg-primary/20"
                        : "bg-crimson/20"
                  }`}
                >
                  <Text
                    className={`text-center text-xs font-semibold leading-[14px] ${
                      box.status === "packed"
                        ? "text-emerald"
                        : box.status === "delivered" || box.status === "unpacked_at_destination"
                          ? "text-primary"
                          : "text-crimson"
                    }`}
                  >
                    {formatStatusLabel(box.status)}
                  </Text>
                </View>
                <View
                  className={`min-h-[24px] items-center justify-center rounded-full px-3 py-1 ${
                    box.isFragile ? "bg-amber-500/20" : "bg-slate-500/20"
                  }`}
                >
                  <Text
                    className={`text-center text-xs font-semibold leading-[14px] ${
                      box.isFragile ? "text-amber-300" : "text-slate-300"
                    }`}
                  >
                    {box.isFragile ? "Fragile" : "Not fragile"}
                  </Text>
                </View>
                <MetaPill icon="clock" text={`Updated ${formatUpdatedAt(box.updatedAt)}`} />
              </View>

              {box.status === "delivered" ? (
                <View className="mt-4">
                  <Button
                    label="Mark as Unpacked"
                    variant="secondary"
                    onPress={() => setIsUnpackModalOpen(true)}
                  />
                </View>
              ) : null}
            </View>

            <View className="mt-6">
              <MetricCard label="Items" value={String(box.itemsCount)} style={{ width: "100%" }} />
            </View>

            <View className="mt-6">
              <SectionHeader
                title="Items in this box"
                actionLabel="Add Item"
                onPressAction={itemModal.openCreateItemModal}
              />
              <View className="mt-3 gap-3">
                {box.items.length > 0 ? (
                  box.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={mapItemToRow(item)}
                      onPressEdit={() => itemModal.openEditItemModal(item)}
                      onPressDelete={() => itemModal.openDeleteItemModal(item)}
                    />
                  ))
                ) : (
                  <EmptyStateCard title="No items yet" description="Add your first item to this box." />
                )}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <QrModal
        visible={qr.isQrModalOpen}
        isGeneratingQr={qr.isGeneratingQr}
        qrMatrix={qr.qrMatrix}
        qrDarkCells={qr.qrDarkCells}
        qrErrorMessage={qr.qrErrorMessage}
        isPrinting={btPrinter.isPrinting}
        printError={btPrinter.printError}
        savedPrinterName={btPrinter.savedPrinter?.name ?? null}
        pairedDevices={btPrinter.pairedDevices}
        isScanning={btPrinter.isScanning}
        scanError={btPrinter.scanError}
        onClose={qr.closeQrModal}
        onPrint={() => {
          if (box && qr.qrAppLinkUrl) {
            const boxIndex = availableBoxes.findIndex((b) => b.id === box.id);
            const boxNumber = boxIndex >= 0 ? boxIndex + 1 : null;
            const routeLabel = boxNumber != null
              ? `#${boxNumber} ${box.name} (${box.roomName})`
              : `${box.name} (${box.roomName})`;
            void btPrinter.printLabel(box.name, qr.qrAppLinkUrl, routeLabel, box.isFragile);
          }
        }}
        onSelectPrinter={() => void btPrinter.prepareScan()}
        onSelectDevice={(device) => void btPrinter.selectPrinter(device)}
        onRescan={() => void btPrinter.rescan()}
        onRegenerate={qr.retryGenerateQr}
      />

      <ItemFormModal
        visible={itemModal.isItemModalOpen}
        mode={itemModal.itemModalMode}
        box={box}
        availableBoxes={availableBoxes}
        selectedBoxForDisplay={itemModal.selectedBoxForDisplay}
        isBoxPickerOpen={itemModal.isBoxPickerOpen}
        capturedPhotoUri={itemModal.itemCapturedPhotoUri}
        existingPhotoUrl={itemModal.itemExistingPhotoUrl}
        photoMarkedForRemoval={itemModal.itemPhotoMarkedForRemoval}
        isNameAiSuggested={itemModal.isItemNameAiSuggested}
        name={itemModal.itemName}
        quantity={itemModal.itemQuantity}
        isFragile={itemModal.itemIsFragile}
        notes={itemModal.itemNotes}
        isSaving={itemModal.isSavingItem}
        error={itemModal.itemModalError}
        windowHeight={windowHeight}
        onClose={itemModal.closeItemModal}
        onSave={() => void itemModal.saveItem()}
        onNameChange={itemModal.handleItemNameChange}
        onQuantityChange={itemModal.setItemQuantity}
        onFragileChange={itemModal.setItemIsFragile}
        onNotesChange={itemModal.setItemNotes}
        onOpenCamera={() => itemModal.setIsItemCameraOpen(true)}
        onRemovePhoto={itemModal.handleItemRemovePhoto}
        onMarkPhotoForRemoval={() => itemModal.setItemPhotoMarkedForRemoval(true)}
        onOpenBoxPicker={() => itemModal.setIsBoxPickerOpen(true)}
        onCloseBoxPicker={() => itemModal.setIsBoxPickerOpen(false)}
        onSelectBox={(boxId) => {
          itemModal.setEditedItemBoxId(boxId);
          itemModal.setIsBoxPickerOpen(false);
        }}
      />

      <EditBoxModal
        visible={boxModal.isEditModalOpen}
        rooms={rooms}
        editedName={boxModal.editedName}
        editedRoomId={boxModal.editedRoomId}
        editedStatus={boxModal.editedStatus}
        isSaving={boxModal.isSaving}
        saveError={boxModal.saveError}
        onClose={boxModal.closeEditModal}
        onSave={() => void boxModal.saveBox()}
        onNameChange={boxModal.setEditedName}
        onRoomChange={boxModal.setEditedRoomId}
        onStatusChange={boxModal.setEditedStatus}
      />

      <DeleteConfirmationModal
        visible={itemModal.isDeleteItemModalOpen}
        title="Delete item?"
        description={
          itemModal.itemPendingDelete
            ? `Delete "${itemModal.itemPendingDelete.name}" permanently.`
            : "Delete this item permanently."
        }
        isDeleting={itemModal.isDeletingItem}
        error={itemModal.deleteItemError}
        onClose={itemModal.closeDeleteItemModal}
        onConfirm={() => void itemModal.deleteItem()}
      />

      <DeleteConfirmationModal
        visible={boxModal.isDeleteModalOpen}
        title="Delete box?"
        description={
          box
            ? `Delete "${box.name}" permanently. Deletion is blocked if the box still has items.`
            : "Delete this box permanently."
        }
        isDeleting={boxModal.isDeleting}
        error={boxModal.deleteError}
        onClose={boxModal.closeDeleteModal}
        onConfirm={() => void boxModal.deleteBox()}
      />

      <DeliveryModal
        visible={isDeliveryModalOpen}
        isLoading={isMarkingDelivered}
        error={deliveryError}
        onConfirm={() => void confirmDelivery()}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      <UnpackModal
        visible={isUnpackModalOpen}
        isLoading={isMarkingUnpacked}
        error={unpackError}
        onConfirm={() => void confirmUnpackAtDestination()}
        onClose={() => setIsUnpackModalOpen(false)}
      />

      <CameraCaptureModal
        visible={itemModal.isItemCameraOpen}
        onClose={() => itemModal.setIsItemCameraOpen(false)}
        onConfirm={itemModal.handleItemCaptureResult}
      />
    </SafeAreaView>
  );
}
