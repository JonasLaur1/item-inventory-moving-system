import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { BoxDetails, BoxDetailsItem, BoxSummary } from '@/lib/box.service';
import type { CaptureResult } from '@/components/ui/camera-capture-modal';
import { useItemModal } from '@/hooks/use-item-modal';

const mockCreateItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockUploadItemPhoto = jest.fn();
const mockRemoveItemPhoto = jest.fn();

jest.mock('@/lib/item.service', () => ({
  itemService: {
    createItem: (...args: unknown[]) => mockCreateItem(...args),
    updateItem: (...args: unknown[]) => mockUpdateItem(...args),
    deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
    uploadItemPhoto: (...args: unknown[]) => mockUploadItemPhoto(...args),
    removeItemPhoto: (...args: unknown[]) => mockRemoveItemPhoto(...args),
  },
}));

// camera-capture-modal exports a type only; no runtime mock needed

const fakeBox: BoxDetails = {
  id: 'box-1',
  name: 'Box 1',
  status: 'unpacked',
  roomId: 'room-1',
  roomName: 'Kitchen',
  locationId: 'loc-1',
  locationName: 'My Home',
  parentLocationId: 'loc-1',
  parentLocationName: 'My Home',
  updatedAt: '2024-01-01T00:00:00Z',
  itemsCount: 1,
  isFragile: false,
  items: [],
};

const fakeBoxSummary: BoxSummary = {
  id: 'box-1',
  name: 'Box 1',
  status: 'unpacked',
  roomId: 'room-1',
  roomName: 'Kitchen',
  locationId: 'loc-1',
  locationName: 'My Home',
  parentLocationId: 'loc-1',
  parentLocationName: 'My Home',
  updatedAt: '2024-01-01T00:00:00Z',
  itemsCount: 1,
  isFragile: false,
};

const fakeItem: BoxDetailsItem = {
  id: 'item-1',
  name: 'Plates',
  notes: null,
  quantity: 4,
  isFragile: false,
  photoUrl: null,
};

const onRefresh = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  onRefresh.mockResolvedValue(undefined);
});

function renderItemModal(box: BoxDetails | null = fakeBox, availableBoxes: BoxSummary[] = [fakeBoxSummary]) {
  return renderHook(() => useItemModal({ box, availableBoxes, onRefresh }));
}

describe('useItemModal – initial state', () => {
  it('starts with all modals closed and flags false', () => {
    const { result } = renderItemModal();

    expect(result.current.isItemModalOpen).toBe(false);
    expect(result.current.isDeleteItemModalOpen).toBe(false);
    expect(result.current.isSavingItem).toBe(false);
    expect(result.current.isDeletingItem).toBe(false);
    expect(result.current.itemModalError).toBeNull();
    expect(result.current.deleteItemError).toBeNull();
    expect(result.current.itemPendingDelete).toBeNull();
  });
});

describe('useItemModal – openCreateItemModal', () => {
  it('is a no-op when box is null', () => {
    const { result } = renderItemModal(null);

    act(() => {
      result.current.openCreateItemModal();
    });

    expect(result.current.isItemModalOpen).toBe(false);
  });

  it('opens modal in create mode with blank fields', () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
    });

    expect(result.current.isItemModalOpen).toBe(true);
    expect(result.current.itemModalMode).toBe('create');
    expect(result.current.itemName).toBe('');
    expect(result.current.itemQuantity).toBe('1');
    expect(result.current.itemIsFragile).toBe(false);
    expect(result.current.itemNotes).toBe('');
    expect(result.current.editedItemBoxId).toBe('box-1');
    expect(result.current.itemModalError).toBeNull();
    expect(result.current.isItemNameAiSuggested).toBe(false);
    expect(result.current.itemCapturedPhotoUri).toBeNull();
  });
});

describe('useItemModal – openEditItemModal', () => {
  it('is a no-op when box is null', () => {
    const { result } = renderItemModal(null);

    act(() => {
      result.current.openEditItemModal(fakeItem);
    });

    expect(result.current.isItemModalOpen).toBe(false);
  });

  it('opens modal in edit mode pre-filled with item data', () => {
    const itemWithPhoto: BoxDetailsItem = { ...fakeItem, photoUrl: 'https://example.com/photo.jpg' };
    const { result } = renderItemModal();

    act(() => {
      result.current.openEditItemModal(itemWithPhoto);
    });

    expect(result.current.isItemModalOpen).toBe(true);
    expect(result.current.itemModalMode).toBe('edit');
    expect(result.current.itemName).toBe('Plates');
    expect(result.current.itemQuantity).toBe('4');
    expect(result.current.itemIsFragile).toBe(false);
    expect(result.current.itemNotes).toBe('');
    expect(result.current.itemExistingPhotoUrl).toBe('https://example.com/photo.jpg');
    expect(result.current.editedItemBoxId).toBe('box-1');
  });
});

describe('useItemModal – closeItemModal', () => {
  it('closes modal and resets fields', () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
    });
    act(() => {
      result.current.closeItemModal();
    });

    expect(result.current.isItemModalOpen).toBe(false);
    expect(result.current.itemModalError).toBeNull();
    expect(result.current.itemCapturedPhotoUri).toBeNull();
    expect(result.current.isItemNameAiSuggested).toBe(false);
  });

  it('is a no-op when isSavingItem', async () => {
    let resolveCreate!: (v: string) => void;
    mockCreateItem.mockReturnValue(new Promise<string>(r => { resolveCreate = r; }));

    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemNameChange('Plates');
    });

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.saveItem();
    });

    // isSavingItem should be true — closeItemModal is a no-op
    act(() => {
      result.current.closeItemModal();
    });

    expect(result.current.isItemModalOpen).toBe(true);

    await act(async () => {
      resolveCreate('item-id');
      await savePromise;
    });
  });
});

describe('useItemModal – handleItemCaptureResult', () => {
  it('sets capturedPhotoUri and suggested name', () => {
    const { result } = renderItemModal();
    const capture: CaptureResult = {
      uri: 'file://photo.jpg',
      base64: 'base64data',
      suggestedName: 'Coffee Mug',
      suggestedNotes: 'Fragile',
    };

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemCaptureResult(capture);
    });

    expect(result.current.itemCapturedPhotoUri).toBe('file://photo.jpg');
    expect(result.current.itemName).toBe('Coffee Mug');
    expect(result.current.itemNotes).toBe('Fragile');
    expect(result.current.isItemNameAiSuggested).toBe(true);
  });

  it('does not overwrite existing notes with suggestion', () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
      result.current.setItemNotes('My notes');
    });

    const capture: CaptureResult = {
      uri: 'file://photo.jpg',
      base64: null,
      suggestedName: 'Mug',
      suggestedNotes: 'Different notes',
    };

    act(() => {
      result.current.handleItemCaptureResult(capture);
    });

    expect(result.current.itemNotes).toBe('My notes');
  });
});

describe('useItemModal – handleItemNameChange', () => {
  it('clears AI suggested flag when name is manually changed', () => {
    const { result } = renderItemModal();
    const capture: CaptureResult = { uri: 'f', base64: null, suggestedName: 'Mug', suggestedNotes: null };

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemCaptureResult(capture);
    });

    expect(result.current.isItemNameAiSuggested).toBe(true);

    act(() => {
      result.current.handleItemNameChange('My mug');
    });

    expect(result.current.itemName).toBe('My mug');
    expect(result.current.isItemNameAiSuggested).toBe(false);
  });
});

describe('useItemModal – handleItemRemovePhoto', () => {
  it('clears captured photo and AI suggested flag', () => {
    const { result } = renderItemModal();
    const capture: CaptureResult = { uri: 'f', base64: 'b64', suggestedName: 'Mug', suggestedNotes: null };

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemCaptureResult(capture);
    });

    act(() => {
      result.current.handleItemRemovePhoto();
    });

    expect(result.current.itemCapturedPhotoUri).toBeNull();
    expect(result.current.isItemNameAiSuggested).toBe(false);
  });
});

describe('useItemModal – saveItem (create mode)', () => {
  it('sets itemModalError when name is empty', async () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(result.current.itemModalError).toBe('Item name is required.');
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('sets itemModalError for invalid quantity', async () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemNameChange('Plates');
      result.current.setItemQuantity('0');
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(result.current.itemModalError).toBe('Quantity must be a whole number greater than 0.');
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('calls createItem with correct args, closes modal, calls onRefresh', async () => {
    mockCreateItem.mockResolvedValue('new-item-id');
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemNameChange('Plates');
      result.current.setItemQuantity('4');
      result.current.setItemIsFragile(true);
      result.current.setItemNotes('Handle with care');
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockCreateItem).toHaveBeenCalledWith({
      name: 'Plates',
      quantity: 4,
      isFragile: true,
      notes: 'Handle with care',
      boxId: 'box-1',
    });
    expect(result.current.isItemModalOpen).toBe(false);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isSavingItem).toBe(false);
  });

  it('uploads photo after create when capturedPhotoBase64 is set', async () => {
    mockCreateItem.mockResolvedValue('new-item-id');
    mockUploadItemPhoto.mockResolvedValue(undefined);
    const { result } = renderItemModal();

    const capture: CaptureResult = {
      uri: 'file://photo.jpg',
      base64: 'base64data',
      suggestedName: null,
      suggestedNotes: null,
    };

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemNameChange('Plates');
      result.current.handleItemCaptureResult(capture);
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockUploadItemPhoto).toHaveBeenCalledWith('new-item-id', 'base64data');
  });

  it('sets isSavingItem true during save, then false', async () => {
    let resolveCreate!: (v: string) => void;
    mockCreateItem.mockReturnValue(new Promise<string>(r => { resolveCreate = r; }));

    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemNameChange('Plates');
    });

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.saveItem();
    });

    expect(result.current.isSavingItem).toBe(true);

    await act(async () => {
      resolveCreate('item-id');
      await savePromise;
    });

    expect(result.current.isSavingItem).toBe(false);
  });

  it('sets itemModalError on failure', async () => {
    mockCreateItem.mockRejectedValue(new Error('Create failed'));
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemNameChange('Plates');
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(result.current.itemModalError).toBe('Create failed');
    expect(result.current.isSavingItem).toBe(false);
    expect(result.current.isItemModalOpen).toBe(true);
  });
});

describe('useItemModal – saveItem (edit mode)', () => {
  it('sets itemModalError when boxId is empty in edit mode', async () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openEditItemModal(fakeItem);
      result.current.setEditedItemBoxId('');
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(result.current.itemModalError).toBe('Box is required.');
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('calls updateItem with correct args, closes modal, calls onRefresh', async () => {
    mockUpdateItem.mockResolvedValue(undefined);
    const { result } = renderItemModal();

    act(() => {
      result.current.openEditItemModal(fakeItem);
      result.current.handleItemNameChange('Mugs');
      result.current.setItemQuantity('6');
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockUpdateItem).toHaveBeenCalledWith('item-1', {
      name: 'Mugs',
      quantity: 6,
      isFragile: false,
      notes: '',
      boxId: 'box-1',
    });
    expect(result.current.isItemModalOpen).toBe(false);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('removes photo when itemPhotoMarkedForRemoval is true', async () => {
    mockUpdateItem.mockResolvedValue(undefined);
    mockRemoveItemPhoto.mockResolvedValue(undefined);
    const itemWithPhoto: BoxDetailsItem = { ...fakeItem, photoUrl: 'https://example.com/photo.jpg' };
    const { result } = renderItemModal();

    act(() => {
      result.current.openEditItemModal(itemWithPhoto);
      result.current.setItemPhotoMarkedForRemoval(true);
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockRemoveItemPhoto).toHaveBeenCalledWith('item-1');
  });
});

describe('useItemModal – openDeleteItemModal / closeDeleteItemModal', () => {
  it('openDeleteItemModal sets pending item and opens modal', () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openDeleteItemModal(fakeItem);
    });

    expect(result.current.isDeleteItemModalOpen).toBe(true);
    expect(result.current.itemPendingDelete).toEqual(fakeItem);
    expect(result.current.deleteItemError).toBeNull();
  });

  it('closeDeleteItemModal closes modal and clears pending item', () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openDeleteItemModal(fakeItem);
    });
    act(() => {
      result.current.closeDeleteItemModal();
    });

    expect(result.current.isDeleteItemModalOpen).toBe(false);
    expect(result.current.itemPendingDelete).toBeNull();
  });
});

describe('useItemModal – deleteItem', () => {
  it('is a no-op when itemPendingDelete is null', async () => {
    const { result } = renderItemModal();

    await act(async () => {
      await result.current.deleteItem();
    });

    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it('calls deleteItem with correct id, closes modal, calls onRefresh', async () => {
    mockDeleteItem.mockResolvedValue(undefined);
    const { result } = renderItemModal();

    act(() => {
      result.current.openDeleteItemModal(fakeItem);
    });

    await act(async () => {
      await result.current.deleteItem();
    });

    expect(mockDeleteItem).toHaveBeenCalledWith('item-1');
    expect(result.current.isDeleteItemModalOpen).toBe(false);
    expect(result.current.itemPendingDelete).toBeNull();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isDeletingItem).toBe(false);
  });

  it('sets isDeletingItem true during delete, then false', async () => {
    let resolveDelete!: () => void;
    mockDeleteItem.mockReturnValue(new Promise<void>(r => { resolveDelete = r; }));

    const { result } = renderItemModal();

    act(() => {
      result.current.openDeleteItemModal(fakeItem);
    });

    let deletePromise!: Promise<void>;
    act(() => {
      deletePromise = result.current.deleteItem();
    });

    expect(result.current.isDeletingItem).toBe(true);

    await act(async () => {
      resolveDelete();
      await deletePromise;
    });

    expect(result.current.isDeletingItem).toBe(false);
  });

  it('sets deleteItemError on failure', async () => {
    mockDeleteItem.mockRejectedValue(new Error('Delete failed'));
    const { result } = renderItemModal();

    act(() => {
      result.current.openDeleteItemModal(fakeItem);
    });

    await act(async () => {
      await result.current.deleteItem();
    });

    expect(result.current.deleteItemError).toBe('Delete failed');
    expect(result.current.isDeletingItem).toBe(false);
  });
});

describe('useItemModal – saveItem (null box guard)', () => {
  it('is a no-op when box is null', async () => {
    const { result } = renderItemModal(null);

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockCreateItem).not.toHaveBeenCalled();
  });
});

describe('useItemModal – saveItem (photo upload failure in create mode)', () => {
  it('continues silently when photo upload throws in create mode', async () => {
    mockCreateItem.mockResolvedValue('new-item-id');
    mockUploadItemPhoto.mockRejectedValue(new Error('upload failed'));
    const { result } = renderItemModal();

    const capture = { uri: 'file://photo.jpg', base64: 'base64data', suggestedName: null, suggestedNotes: null };

    act(() => {
      result.current.openCreateItemModal();
      result.current.handleItemNameChange('Plates');
      result.current.handleItemCaptureResult(capture);
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockUploadItemPhoto).toHaveBeenCalled();
    // Modal closes despite photo upload failure (non-fatal)
    expect(result.current.isItemModalOpen).toBe(false);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('useItemModal – saveItem (edit mode photo paths)', () => {
  it('continues silently when photo upload throws in edit mode', async () => {
    mockUpdateItem.mockResolvedValue(undefined);
    mockUploadItemPhoto.mockRejectedValue(new Error('upload failed'));
    const { result } = renderItemModal();

    const capture = { uri: 'file://photo.jpg', base64: 'base64data', suggestedName: null, suggestedNotes: null };

    act(() => {
      result.current.openEditItemModal(fakeItem);
      result.current.handleItemCaptureResult(capture);
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockUploadItemPhoto).toHaveBeenCalled();
    expect(result.current.isItemModalOpen).toBe(false);
  });

  it('continues silently when photo removal throws in edit mode', async () => {
    mockUpdateItem.mockResolvedValue(undefined);
    mockRemoveItemPhoto.mockRejectedValue(new Error('removal failed'));
    const itemWithPhoto = { ...fakeItem, photoUrl: 'https://example.com/photo.jpg' };
    const { result } = renderItemModal();

    act(() => {
      result.current.openEditItemModal(itemWithPhoto);
      result.current.setItemPhotoMarkedForRemoval(true);
    });

    await act(async () => {
      await result.current.saveItem();
    });

    expect(mockRemoveItemPhoto).toHaveBeenCalled();
    expect(result.current.isItemModalOpen).toBe(false);
  });
});

describe('useItemModal – closeDeleteItemModal (isDeletingItem guard)', () => {
  it('is a no-op when isDeletingItem is true', async () => {
    let resolveDelete!: () => void;
    mockDeleteItem.mockReturnValue(new Promise<void>(r => { resolveDelete = r; }));

    const { result } = renderItemModal();

    act(() => {
      result.current.openDeleteItemModal(fakeItem);
    });

    let deletePromise!: Promise<void>;
    act(() => {
      deletePromise = result.current.deleteItem();
    });

    // isDeletingItem is true — closeDeleteItemModal should be no-op
    act(() => {
      result.current.closeDeleteItemModal();
    });

    expect(result.current.isDeleteItemModalOpen).toBe(true);

    await act(async () => {
      resolveDelete();
      await deletePromise;
    });
  });
});

describe('useItemModal – selectedBoxForDisplay', () => {
  it('returns the matching box from availableBoxes', () => {
    const { result } = renderItemModal();

    act(() => {
      result.current.openCreateItemModal();
    });

    // editedItemBoxId is set to box.id ('box-1') on open
    expect(result.current.selectedBoxForDisplay).toEqual(fakeBoxSummary);
  });

  it('returns null when no match found', () => {
    const { result } = renderItemModal(fakeBox, []);

    act(() => {
      result.current.openCreateItemModal();
    });

    expect(result.current.selectedBoxForDisplay).toBeNull();
  });
});
