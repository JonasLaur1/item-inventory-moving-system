import { boxService, type BoxDetails } from "@/lib/box.service";
import { clampToEditableStatus, type EditableStatus } from "@/utils/box-detail-utils";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

type UseBoxModalParams = {
  box: BoxDetails | null;
  onRefresh: () => Promise<void>;
};

type UseBoxModalResult = {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  editedName: string;
  setEditedName: (name: string) => void;
  editedRoomId: string;
  setEditedRoomId: (roomId: string) => void;
  editedStatus: EditableStatus;
  setEditedStatus: (status: EditableStatus) => void;
  isSaving: boolean;
  saveError: string | null;
  saveBox: () => Promise<void>;
  openEditModal: () => void;
  closeEditModal: () => void;
  isDeleteModalOpen: boolean;
  isDeleting: boolean;
  deleteError: string | null;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;
  deleteBox: () => Promise<void>;
};

export function useBoxModal({ box, onRefresh }: UseBoxModalParams): UseBoxModalResult {
  const router = useRouter();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedRoomId, setEditedRoomId] = useState("");
  const [editedStatus, setEditedStatus] = useState<EditableStatus>("unpacked");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!box) {
      return;
    }

    setEditedName(box.name);
    setEditedRoomId(box.roomId);
    setEditedStatus(clampToEditableStatus(box.status));
  }, [box]);

  const openEditModal = useCallback(() => {
    if (!box) {
      return;
    }

    setEditedName(box.name);
    setEditedRoomId(box.roomId);
    setEditedStatus(clampToEditableStatus(box.status));
    setSaveError(null);
    setIsEditModalOpen(true);
  }, [box]);

  const closeEditModal = useCallback(() => {
    if (isSaving || !box) {
      return;
    }

    setEditedName(box.name);
    setEditedRoomId(box.roomId);
    setEditedStatus(clampToEditableStatus(box.status));
    setSaveError(null);
    setIsEditModalOpen(false);
  }, [box, isSaving]);

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

    if (normalizedName === box.name && editedRoomId === box.roomId && editedStatus === box.status) {
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
      await onRefresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update box.");
    } finally {
      setIsSaving(false);
    }
  }, [box, editedName, editedRoomId, editedStatus, onRefresh]);

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
      setDeleteError(error instanceof Error ? error.message : "Failed to delete box.");
    } finally {
      setIsDeleting(false);
    }
  }, [box, router]);

  return {
    isEditModalOpen,
    setIsEditModalOpen,
    editedName,
    setEditedName,
    editedRoomId,
    setEditedRoomId,
    editedStatus,
    setEditedStatus,
    isSaving,
    saveError,
    saveBox,
    openEditModal,
    closeEditModal,
    isDeleteModalOpen,
    isDeleting,
    deleteError,
    openDeleteModal,
    closeDeleteModal,
    deleteBox,
  };
}
