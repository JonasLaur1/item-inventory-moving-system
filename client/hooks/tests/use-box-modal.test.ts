import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { BoxDetails } from '@/lib/box.service';
import { useBoxModal } from '@/hooks/use-box-modal';

const mockUpdateBox = jest.fn();
const mockDeleteBox = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@/lib/box.service', () => ({
  boxService: {
    updateBox: (...args: unknown[]) => mockUpdateBox(...args),
    deleteBox: (...args: unknown[]) => mockDeleteBox(...args),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: (...args: unknown[]) => mockRouterBack(...args),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    canGoBack: () => mockCanGoBack(),
  }),
}));

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
  itemsCount: 0,
  isFragile: false,
  items: [],
};

const onRefresh = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  onRefresh.mockResolvedValue(undefined);
});

function renderBoxModal(box: BoxDetails | null = fakeBox) {
  return renderHook(() => useBoxModal({ box, onRefresh }));
}

describe('useBoxModal – initial state', () => {
  it('starts with modals closed and flags false', () => {
    const { result } = renderBoxModal();

    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.saveError).toBeNull();
    expect(result.current.deleteError).toBeNull();
  });

  it('initialises edit fields from box', () => {
    const { result } = renderBoxModal();

    expect(result.current.editedName).toBe('Box 1');
    expect(result.current.editedRoomId).toBe('room-1');
    expect(result.current.editedStatus).toBe('unpacked');
  });
});

describe('useBoxModal – openEditModal / closeEditModal', () => {
  it('openEditModal is a no-op when box is null', () => {
    const { result } = renderBoxModal(null);

    act(() => {
      result.current.openEditModal();
    });

    expect(result.current.isEditModalOpen).toBe(false);
  });

  it('openEditModal opens the modal and resets fields from box', () => {
    const { result } = renderBoxModal();

    // Dirty the fields first
    act(() => {
      result.current.setEditedName('Dirty Name');
    });

    act(() => {
      result.current.openEditModal();
    });

    expect(result.current.isEditModalOpen).toBe(true);
    expect(result.current.editedName).toBe('Box 1');
    expect(result.current.saveError).toBeNull();
  });

  it('closeEditModal is a no-op when isSaving', async () => {
    let resolveUpdate!: () => void;
    mockUpdateBox.mockReturnValue(new Promise<void>(r => { resolveUpdate = r; }));

    const { result } = renderBoxModal();

    act(() => {
      result.current.openEditModal();
    });
    act(() => {
      result.current.setEditedName('New Name');
    });

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.saveBox();
    });

    // isSaving is true → closeEditModal should be no-op
    act(() => {
      result.current.closeEditModal();
    });

    expect(result.current.isEditModalOpen).toBe(true);

    await act(async () => {
      resolveUpdate();
      await savePromise;
    });
  });

  it('closeEditModal resets fields and closes modal', () => {
    const { result } = renderBoxModal();

    act(() => {
      result.current.openEditModal();
    });
    act(() => {
      result.current.setEditedName('Dirty');
    });
    act(() => {
      result.current.closeEditModal();
    });

    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.editedName).toBe('Box 1');
  });
});

describe('useBoxModal – saveBox', () => {
  it('sets saveError if name is empty', async () => {
    const { result } = renderBoxModal();

    act(() => {
      result.current.openEditModal();
      result.current.setEditedName('   ');
    });

    await act(async () => {
      await result.current.saveBox();
    });

    expect(result.current.saveError).toBe('Box name is required.');
    expect(mockUpdateBox).not.toHaveBeenCalled();
  });

  it('sets saveError if roomId is empty', async () => {
    const { result } = renderBoxModal();

    act(() => {
      result.current.openEditModal();
      result.current.setEditedRoomId('');
    });

    await act(async () => {
      await result.current.saveBox();
    });

    expect(result.current.saveError).toBe('Room is required.');
    expect(mockUpdateBox).not.toHaveBeenCalled();
  });

  it('closes modal without calling service when nothing changed', async () => {
    const { result } = renderBoxModal();

    act(() => {
      result.current.openEditModal();
    });

    await act(async () => {
      await result.current.saveBox();
    });

    expect(result.current.isEditModalOpen).toBe(false);
    expect(mockUpdateBox).not.toHaveBeenCalled();
  });

  it('calls service with correct args on success, closes modal, calls onRefresh', async () => {
    mockUpdateBox.mockResolvedValue(undefined);
    const { result } = renderBoxModal();

    act(() => {
      result.current.openEditModal();
      result.current.setEditedName('New Name');
    });

    await act(async () => {
      await result.current.saveBox();
    });

    expect(mockUpdateBox).toHaveBeenCalledWith('box-1', {
      name: 'New Name',
      roomId: 'room-1',
      status: 'unpacked',
    });
    expect(result.current.isEditModalOpen).toBe(false);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
  });

  it('sets saveError and keeps modal open on failure', async () => {
    mockUpdateBox.mockRejectedValue(new Error('Save failed'));
    const { result } = renderBoxModal();

    act(() => {
      result.current.openEditModal();
      result.current.setEditedName('New Name');
    });

    await act(async () => {
      await result.current.saveBox();
    });

    expect(result.current.saveError).toBe('Save failed');
    expect(result.current.isEditModalOpen).toBe(true);
    expect(result.current.isSaving).toBe(false);
  });
});

describe('useBoxModal – openDeleteModal / closeDeleteModal', () => {
  it('openDeleteModal is a no-op when box is null', () => {
    const { result } = renderBoxModal(null);

    act(() => {
      result.current.openDeleteModal();
    });

    expect(result.current.isDeleteModalOpen).toBe(false);
  });

  it('openDeleteModal opens the delete modal', () => {
    const { result } = renderBoxModal();

    act(() => {
      result.current.openDeleteModal();
    });

    expect(result.current.isDeleteModalOpen).toBe(true);
    expect(result.current.deleteError).toBeNull();
  });

  it('closeDeleteModal closes the modal when not deleting', () => {
    const { result } = renderBoxModal();

    act(() => {
      result.current.openDeleteModal();
    });
    act(() => {
      result.current.closeDeleteModal();
    });

    expect(result.current.isDeleteModalOpen).toBe(false);
  });
});

describe('useBoxModal – deleteBox', () => {
  it('is a no-op when box is null', async () => {
    const { result } = renderBoxModal(null);

    await act(async () => {
      await result.current.deleteBox();
    });

    expect(mockDeleteBox).not.toHaveBeenCalled();
  });

  it('calls service and navigates back when canGoBack', async () => {
    mockDeleteBox.mockResolvedValue(undefined);
    mockCanGoBack.mockReturnValue(true);
    const { result } = renderBoxModal();

    await act(async () => {
      await result.current.deleteBox();
    });

    expect(mockDeleteBox).toHaveBeenCalledWith('box-1');
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(result.current.isDeleting).toBe(false);
  });

  it('replaces to inventory when canGoBack returns false', async () => {
    mockDeleteBox.mockResolvedValue(undefined);
    mockCanGoBack.mockReturnValue(false);
    const { result } = renderBoxModal();

    await act(async () => {
      await result.current.deleteBox();
    });

    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/inventory');
  });

  it('sets deleteError and keeps deleting false on failure', async () => {
    mockDeleteBox.mockRejectedValue(new Error('Delete failed'));
    const { result } = renderBoxModal();

    await act(async () => {
      await result.current.deleteBox();
    });

    expect(result.current.deleteError).toBe('Delete failed');
    expect(result.current.isDeleting).toBe(false);
  });

  it('sets isDeleting true during delete, then false', async () => {
    let resolveDelete!: () => void;
    mockDeleteBox.mockReturnValue(new Promise<void>(r => { resolveDelete = r; }));
    mockCanGoBack.mockReturnValue(true);

    const { result } = renderBoxModal();

    let deletePromise!: Promise<void>;
    act(() => {
      deletePromise = result.current.deleteBox();
    });

    expect(result.current.isDeleting).toBe(true);

    await act(async () => {
      resolveDelete();
      await deletePromise;
    });

    expect(result.current.isDeleting).toBe(false);
  });
});
