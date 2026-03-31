import { type CaptureResult } from "@/components/ui/camera-capture-modal";
import { type BoxDetails, type BoxDetailsItem, type BoxSummary } from "@/lib/box.service";
import { itemService } from "@/lib/item.service";
import { parseQuantity } from "@/utils/box-detail-utils";
import { useCallback, useMemo, useState } from "react";

type ItemModalMode = "create" | "edit";

type UseItemModalParams = {
  box: BoxDetails | null;
  availableBoxes: BoxSummary[];
  onRefresh: () => Promise<void>;
};

type UseItemModalResult = {
  isItemModalOpen: boolean;
  itemModalMode: ItemModalMode;
  itemName: string;
  itemQuantity: string;
  itemIsFragile: boolean;
  itemNotes: string;
  isSavingItem: boolean;
  itemModalError: string | null;
  isItemCameraOpen: boolean;
  itemCapturedPhotoUri: string | null;
  itemExistingPhotoUrl: string | null;
  itemPhotoMarkedForRemoval: boolean;
  isItemNameAiSuggested: boolean;
  isBoxPickerOpen: boolean;
  editedItemBoxId: string;
  selectedBoxForDisplay: BoxSummary | null;
  isDeleteItemModalOpen: boolean;
  itemPendingDelete: BoxDetailsItem | null;
  isDeletingItem: boolean;
  deleteItemError: string | null;
  setItemQuantity: (value: string) => void;
  setItemIsFragile: (value: boolean) => void;
  setItemNotes: (value: string) => void;
  setItemPhotoMarkedForRemoval: (value: boolean) => void;
  setIsItemCameraOpen: (value: boolean) => void;
  setIsBoxPickerOpen: (value: boolean) => void;
  setEditedItemBoxId: (value: string) => void;
  openCreateItemModal: () => void;
  openEditItemModal: (item: BoxDetailsItem) => void;
  closeItemModal: () => void;
  handleItemCaptureResult: (result: CaptureResult) => void;
  handleItemRemovePhoto: () => void;
  handleItemNameChange: (text: string) => void;
  saveItem: () => Promise<void>;
  openDeleteItemModal: (item: BoxDetailsItem) => void;
  closeDeleteItemModal: () => void;
  deleteItem: () => Promise<void>;
};

export function useItemModal({ box, availableBoxes, onRefresh }: UseItemModalParams): UseItemModalResult {
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

  const [isItemCameraOpen, setIsItemCameraOpen] = useState(false);
  const [itemCapturedPhotoUri, setItemCapturedPhotoUri] = useState<string | null>(null);
  const [itemCapturedPhotoBase64, setItemCapturedPhotoBase64] = useState<string | null>(null);
  const [itemExistingPhotoUrl, setItemExistingPhotoUrl] = useState<string | null>(null);
  const [itemPhotoMarkedForRemoval, setItemPhotoMarkedForRemoval] = useState(false);
  const [isItemNameAiSuggested, setIsItemNameAiSuggested] = useState(false);

  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<BoxDetailsItem | null>(null);
  const [isBoxPickerOpen, setIsBoxPickerOpen] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);

  const selectedBoxForDisplay = useMemo(
    () => availableBoxes.find((b) => b.id === editedItemBoxId) ?? null,
    [availableBoxes, editedItemBoxId],
  );

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
    setItemCapturedPhotoUri(null);
    setItemCapturedPhotoBase64(null);
    setItemExistingPhotoUrl(null);
    setItemPhotoMarkedForRemoval(false);
    setIsItemNameAiSuggested(false);
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
      setItemCapturedPhotoUri(null);
      setItemCapturedPhotoBase64(null);
      setItemExistingPhotoUrl(item.photoUrl);
      setItemPhotoMarkedForRemoval(false);
      setIsItemNameAiSuggested(false);
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
    setItemCapturedPhotoUri(null);
    setItemCapturedPhotoBase64(null);
    setItemExistingPhotoUrl(null);
    setItemPhotoMarkedForRemoval(false);
    setIsItemNameAiSuggested(false);
  }, [isSavingItem]);

  const handleItemCaptureResult = useCallback(
    (result: CaptureResult) => {
      setIsItemCameraOpen(false);
      setItemCapturedPhotoUri(result.uri);
      setItemCapturedPhotoBase64(result.base64);
      setItemPhotoMarkedForRemoval(false);

      if (result.suggestedName) {
        setItemName(result.suggestedName);
        setIsItemNameAiSuggested(true);

        if (!itemNotes.trim() && result.suggestedNotes) {
          setItemNotes(result.suggestedNotes);
        }
      }
    },
    [itemNotes],
  );

  const handleItemRemovePhoto = useCallback(() => {
    setItemCapturedPhotoUri(null);
    setItemCapturedPhotoBase64(null);
    setIsItemNameAiSuggested(false);
  }, []);

  const handleItemNameChange = useCallback((text: string) => {
    setItemName(text);
    setIsItemNameAiSuggested(false);
  }, []);

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
        const itemId = await itemService.createItem({
          name: normalizedName,
          quantity: parsedQuantity,
          isFragile: itemIsFragile,
          notes: itemNotes,
          boxId: box.id,
        });

        if (itemCapturedPhotoBase64) {
          try {
            await itemService.uploadItemPhoto(itemId, itemCapturedPhotoBase64);
          } catch (photoErr) {
            console.warn("Photo upload failed:", photoErr);
          }
        }
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

        if (itemCapturedPhotoBase64) {
          try {
            await itemService.uploadItemPhoto(activeItemId, itemCapturedPhotoBase64);
          } catch (photoErr) {
            console.warn("Photo upload failed:", photoErr);
          }
        } else if (itemPhotoMarkedForRemoval) {
          try {
            await itemService.removeItemPhoto(activeItemId);
          } catch (photoErr) {
            console.warn("Photo removal failed:", photoErr);
          }
        }
      }

      setIsItemModalOpen(false);
      await onRefresh();
    } catch (error) {
      setItemModalError(error instanceof Error ? error.message : "Failed to save item.");
    } finally {
      setIsSavingItem(false);
    }
  }, [
    activeItemId,
    box,
    editedItemBoxId,
    itemCapturedPhotoBase64,
    itemIsFragile,
    itemModalMode,
    itemName,
    itemNotes,
    itemPhotoMarkedForRemoval,
    itemQuantity,
    onRefresh,
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
      await onRefresh();
    } catch (error) {
      setDeleteItemError(error instanceof Error ? error.message : "Failed to delete item.");
    } finally {
      setIsDeletingItem(false);
    }
  }, [itemPendingDelete, onRefresh]);

  return {
    isItemModalOpen,
    itemModalMode,
    itemName,
    itemQuantity,
    itemIsFragile,
    itemNotes,
    isSavingItem,
    itemModalError,
    isItemCameraOpen,
    itemCapturedPhotoUri,
    itemExistingPhotoUrl,
    itemPhotoMarkedForRemoval,
    isItemNameAiSuggested,
    isBoxPickerOpen,
    editedItemBoxId,
    selectedBoxForDisplay,
    isDeleteItemModalOpen,
    itemPendingDelete,
    isDeletingItem,
    deleteItemError,
    setItemQuantity,
    setItemIsFragile,
    setItemNotes,
    setItemPhotoMarkedForRemoval,
    setIsItemCameraOpen,
    setIsBoxPickerOpen,
    setEditedItemBoxId,
    openCreateItemModal,
    openEditItemModal,
    closeItemModal,
    handleItemCaptureResult,
    handleItemRemovePhoto,
    handleItemNameChange,
    saveItem,
    openDeleteItemModal,
    closeDeleteItemModal,
    deleteItem,
  };
}
