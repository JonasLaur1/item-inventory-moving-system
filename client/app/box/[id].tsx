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
import { roomService, type RoomSummary } from "@/lib/room.service";
import { generateBoxQrData, generateQrDataUrl, type QrMatrix } from "@/utils/box-qr";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

type EditableStatus = "packed" | "unpacked";
type ItemModalMode = "create" | "edit";

const editableStatuses: { label: string; value: EditableStatus }[] = [
  { label: "Packed", value: "packed" },
  { label: "Unpacked", value: "unpacked" },
];
const QR_DISPLAY_SIZE = 196;
const QR_QUIET_ZONE_MODULES = 4;

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
    quantity: item.quantity,
    badgeText: item.isFragile ? "Fragile" : "Not fragile",
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
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState<BoxSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(shouldStartEditing);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedRoomId, setEditedRoomId] = useState("");
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
  const [itemIsFragile, setItemIsFragile] = useState(false);
  const [itemNotes, setItemNotes] = useState("");
  const [editedItemBoxId, setEditedItemBoxId] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemModalError, setItemModalError] = useState<string | null>(null);

  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<BoxDetailsItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);
  const [qrAppLinkUrl, setQrAppLinkUrl] = useState<string | null>(null);
  const [qrMatrix, setQrMatrix] = useState<QrMatrix | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);
  const [isSharingQr, setIsSharingQr] = useState(false);
  const [shareQrError, setShareQrError] = useState<string | null>(null);
  const [qrVersion, setQrVersion] = useState(0);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

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
    setEditedRoomId(box.roomId);
    setEditedStatus(box.status);
  }, [box]);

  useEffect(() => {
    let isActive = true;

    if (!box || !isQrModalOpen) {
      setQrAppLinkUrl(null);
      setQrMatrix(null);
      setQrErrorMessage(null);
      setShareQrError(null);
      setIsGeneratingQr(false);
      return () => {
        isActive = false;
      };
    }

    setIsGeneratingQr(true);
    setQrErrorMessage(null);
    setShareQrError(null);

    void (async () => {
      try {
        const generatedQr = generateBoxQrData(box.id);

        if (!isActive) {
          return;
        }

        setQrAppLinkUrl(generatedQr.appLinkUrl);
        setQrMatrix(generatedQr.matrix);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to generate QR code.";
        setQrAppLinkUrl(null);
        setQrMatrix(null);
        setQrErrorMessage(message);
      } finally {
        if (isActive) {
          setIsGeneratingQr(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [box, isQrModalOpen, qrVersion]);

  const qrDarkCells = useMemo(() => {
    if (!qrMatrix) {
      return [];
    }

    const modulesPerSide = qrMatrix.size + QR_QUIET_ZONE_MODULES * 2;
    const cellSize = QR_DISPLAY_SIZE / modulesPerSide;
    const cells: { x: number; y: number; size: number; key: string }[] = [];

    for (let row = 0; row < qrMatrix.size; row += 1) {
      for (let column = 0; column < qrMatrix.size; column += 1) {
        const index = row * qrMatrix.size + column;
        if (!qrMatrix.modules[index]) {
          continue;
        }

        const x = (column + QR_QUIET_ZONE_MODULES) * cellSize;
        const y = (row + QR_QUIET_ZONE_MODULES) * cellSize;
        cells.push({ x, y, size: cellSize, key: `${row}-${column}` });
      }
    }

    return cells;
  }, [qrMatrix]);

  const saveBox = useCallback(async () => {
    if (!box) {
      return;
    }

    const normalizedName = editedName.trim();
    if (!normalizedName) {
      setSaveError("Box name is required.");
      return;
    }

    if (!editedRoomId) {
      setSaveError("Room is required.");
      return;
    }

    if (
      normalizedName === box.name &&
      editedRoomId === box.roomId &&
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
        roomId: editedRoomId,
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
  }, [box, editedName, editedRoomId, editedStatus, loadBox]);

  const openEditModal = useCallback(() => {
    if (!box) {
      return;
    }

    setEditedName(box.name);
    setEditedRoomId(box.roomId);
    setEditedStatus(box.status);
    setSaveError(null);
    setIsEditModalOpen(true);
  }, [box]);

  const closeEditModal = useCallback(() => {
    if (isSaving || !box) {
      return;
    }

    setEditedName(box.name);
    setEditedRoomId(box.roomId);
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
    setItemIsFragile(false);
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
      setItemIsFragile(item.isFragile);
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
          isFragile: itemIsFragile,
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
          isFragile: itemIsFragile,
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
  }, [
    activeItemId,
    box,
    editedItemBoxId,
    itemIsFragile,
    itemModalMode,
    itemName,
    itemNotes,
    itemQuantity,
    loadBox,
  ]);

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

  const printBoxQrLabel = useCallback(async () => {
    if (!box || !qrAppLinkUrl || isSharingQr) {
      return;
    }

    setIsSharingQr(true);
    setShareQrError(null);

    try {
      const qrDataUrl = await generateQrDataUrl(qrAppLinkUrl, 720);
      const safeBoxName = box.name
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

      await Print.printAsync({
        html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeBoxName} QR Label</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .page {
        display: flex;
        min-height: 100vh;
        align-items: center;
        justify-content: center;
      }
      .label {
        width: 320px;
        text-align: center;
      }
      .title {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .qr {
        width: 280px;
        height: 280px;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="label">
        <div class="title">${safeBoxName}</div>
        <img class="qr" src="${qrDataUrl}" alt="Box QR code" />
      </div>
    </div>
  </body>
</html>`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open print dialog.";
      setShareQrError(message);
    } finally {
      setIsSharingQr(false);
    }
  }, [box, isSharingQr, qrAppLinkUrl]);

  const retryGenerateQr = useCallback(() => {
    if (isGeneratingQr) {
      return;
    }

    setQrVersion((previousValue) => previousValue + 1);
  }, [isGeneratingQr]);

  const openQrModal = useCallback(() => {
    if (!box) {
      return;
    }

    setShareQrError(null);
    setIsQrModalOpen(true);
  }, [box]);

  const closeQrModal = useCallback(() => {
    if (isSharingQr) {
      return;
    }

    setIsQrModalOpen(false);
  }, [isSharingQr]);

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
                    onPress={openQrModal}
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
                    disabled={isDeleting}
                  >
                    <MaterialCommunityIcons name="qrcode" size={20} color={Colors.dark.textPrimary} />
                  </Pressable>
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
            </View>

            <View className="mt-6">
              <MetricCard
                label="Items"
                value={String(box.itemsCount)}
                style={{ width: "100%" }}
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
        visible={isQrModalOpen}
        title="Box QR label"
        description="Scan this QR code to open the box directly in the app."
        onRequestClose={closeQrModal}
        showCornerClose
        maxWidth={420}
      >
        {isGeneratingQr ? (
          <View className="items-center justify-center rounded-control border border-border-default bg-bg-input/60 px-4 py-8">
            <ActivityIndicator />
            <Text className="mt-3 text-xs text-text-tertiary">Generating QR code...</Text>
          </View>
        ) : qrMatrix ? (
          <>
            <View className="items-center rounded-control border border-border-default bg-bg-input/60 px-4 py-4">
              <Svg width={QR_DISPLAY_SIZE} height={QR_DISPLAY_SIZE} viewBox={`0 0 ${QR_DISPLAY_SIZE} ${QR_DISPLAY_SIZE}`}>
                <Rect x={0} y={0} width={QR_DISPLAY_SIZE} height={QR_DISPLAY_SIZE} fill="#FFFFFF" />
                {qrDarkCells.map((cell) => (
                  <Rect
                    key={cell.key}
                    x={cell.x}
                    y={cell.y}
                    width={cell.size}
                    height={cell.size}
                    fill="#000000"
                  />
                ))}
              </Svg>
            </View>
            <View className="mt-4 flex-row gap-3">
              <Button
                label={isSharingQr ? "Printing..." : "Print"}
                onPress={() => void printBoxQrLabel()}
                disabled={isSharingQr}
                className="flex-1"
              />
              <Button
                label="Regenerate"
                variant="secondary"
                onPress={retryGenerateQr}
                disabled={isSharingQr}
                className="flex-1"
              />
            </View>
          </>
        ) : (
          <View className="rounded-control border border-border-default bg-bg-input/60 px-4 py-4">
            <Text className="text-sm font-semibold text-text-primary">Could not generate QR code.</Text>
            <Text className="mt-1 text-xs text-text-tertiary">
              {qrErrorMessage ?? "Try generating again."}
            </Text>
            <Button
              label="Retry"
              variant="secondary"
              onPress={retryGenerateQr}
              className="mt-4"
            />
          </View>
        )}

        {shareQrError ? <Text className="mt-3 text-xs text-crimson">{shareQrError}</Text> : null}
      </AppModal>

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
          <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">Fragility</Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={() => setItemIsFragile(false)}
              disabled={isSavingItem}
              className={`flex-1 items-center rounded-control border py-2.5 ${
                !itemIsFragile
                  ? "border-primary bg-primary/15"
                  : "border-border-default bg-bg-input/60"
              }`}
            >
              <Text className="text-sm font-semibold text-text-primary">Not fragile</Text>
            </Pressable>
            <Pressable
              onPress={() => setItemIsFragile(true)}
              disabled={isSavingItem}
              className={`flex-1 items-center rounded-control border py-2.5 ${
                itemIsFragile
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
          <View className="mt-2 gap-2">
            {itemModalMode === "create" && box ? (
              <View className="rounded-control border border-primary bg-primary/15 px-3 py-2.5">
                <Text className="text-sm font-semibold text-text-primary">{box.name}</Text>
                <Text className="mt-1 text-xs text-text-tertiary">
                  {box.parentLocationName} / {box.roomName}
                </Text>
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
                    <Text className="mt-1 text-xs text-text-tertiary">
                      {availableBox.parentLocationName} / {availableBox.roomName}
                    </Text>
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
            {rooms.length > 0 ? (
              rooms.map((room) => {
                const isActive = room.id === editedRoomId;
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => setEditedRoomId(room.id)}
                    disabled={isSaving}
                    className={`rounded-control border px-3 py-2.5 ${
                      isActive
                        ? "border-primary bg-primary/15"
                        : "border-border-default bg-bg-input/60"
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
