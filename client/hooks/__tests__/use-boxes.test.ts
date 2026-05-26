import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { BoxSummary } from '@/lib/box.service';
import { useBoxes } from '@/hooks/use-boxes';

const mockListBoxes = jest.fn();
const mockCreateBox = jest.fn();
const mockUpdateBox = jest.fn();
const mockDeleteBox = jest.fn();

jest.mock('@/lib/box.service', () => ({
  boxService: {
    listBoxes: (...args: unknown[]) => mockListBoxes(...args),
    createBox: (...args: unknown[]) => mockCreateBox(...args),
    updateBox: (...args: unknown[]) => mockUpdateBox(...args),
    deleteBox: (...args: unknown[]) => mockDeleteBox(...args),
  },
}));

const fakeBox: BoxSummary = {
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
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBoxes – initial state', () => {
  it('starts with isLoading true and empty boxes', () => {
    mockListBoxes.mockResolvedValue([]);
    const { result } = renderHook(() => useBoxes());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.boxes).toEqual([]);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe('useBoxes – loading', () => {
  it('loads boxes on mount', async () => {
    mockListBoxes.mockResolvedValue([fakeBox]);
    const { result } = renderHook(() => useBoxes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.boxes).toHaveLength(1);
    expect(result.current.boxes[0]).toEqual(fakeBox);
    expect(result.current.errorMessage).toBeNull();
  });

  it('sets errorMessage when load fails', async () => {
    mockListBoxes.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useBoxes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Network error');
    expect(result.current.boxes).toEqual([]);
  });

  it('uses fallback message for non-Error rejections', async () => {
    mockListBoxes.mockRejectedValue('unexpected');
    const { result } = renderHook(() => useBoxes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Failed to load boxes.');
  });
});

describe('useBoxes – refresh', () => {
  it('sets isRefreshing (not isLoading) during refresh', async () => {
    mockListBoxes.mockResolvedValue([]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveRefresh!: (v: BoxSummary[]) => void;
    mockListBoxes.mockReturnValue(
      new Promise<BoxSummary[]>(r => { resolveRefresh = r; }),
    );

    act(() => {
      void result.current.refreshBoxes();
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveRefresh([fakeBox]);
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.boxes).toHaveLength(1);
  });
});

describe('useBoxes – createBox', () => {
  it('sets isCreating true during create, then false', async () => {
    mockListBoxes.mockResolvedValue([]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveCreate!: (v: string) => void;
    mockCreateBox.mockReturnValue(new Promise<string>(r => { resolveCreate = r; }));
    mockListBoxes.mockResolvedValue([]);

    let createPromise!: Promise<string>;
    act(() => {
      createPromise = result.current.createBox({ name: 'Box 1', roomId: 'room-1', status: 'unpacked' });
    });

    expect(result.current.isCreating).toBe(true);

    await act(async () => {
      resolveCreate('box-id');
      await createPromise;
    });

    expect(result.current.isCreating).toBe(false);
  });

  it('calls service with correct args and returns boxId', async () => {
    mockListBoxes.mockResolvedValue([]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockCreateBox.mockResolvedValue('new-box-id');
    mockListBoxes.mockResolvedValue([fakeBox]);

    let returnedId!: string;
    await act(async () => {
      returnedId = await result.current.createBox({ name: 'Box 1', roomId: 'room-1', status: 'unpacked' });
    });

    expect(mockCreateBox).toHaveBeenCalledWith({ name: 'Box 1', roomId: 'room-1', status: 'unpacked' });
    expect(returnedId).toBe('new-box-id');
    expect(result.current.boxes).toHaveLength(1);
  });

  it('sets errorMessage and re-throws on failure', async () => {
    mockListBoxes.mockResolvedValue([]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockCreateBox.mockRejectedValue(new Error('Create failed'));

    await act(async () => {
      await expect(
        result.current.createBox({ name: 'Box 1', roomId: 'room-1', status: 'unpacked' }),
      ).rejects.toThrow('Create failed');
    });

    expect(result.current.errorMessage).toBe('Create failed');
    expect(result.current.isCreating).toBe(false);
  });
});

describe('useBoxes – updateBox', () => {
  it('sets isUpdating true during update, then false', async () => {
    mockListBoxes.mockResolvedValue([fakeBox]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveUpdate!: () => void;
    mockUpdateBox.mockReturnValue(new Promise<void>(r => { resolveUpdate = r; }));
    mockListBoxes.mockResolvedValue([fakeBox]);

    let updatePromise!: Promise<void>;
    act(() => {
      updatePromise = result.current.updateBox('box-1', { name: 'Updated', roomId: 'room-1', status: 'packed' });
    });

    expect(result.current.isUpdating).toBe(true);

    await act(async () => {
      resolveUpdate();
      await updatePromise;
    });

    expect(result.current.isUpdating).toBe(false);
  });

  it('calls service with correct args and triggers refresh', async () => {
    mockListBoxes.mockResolvedValue([fakeBox]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateBox.mockResolvedValue(undefined);
    mockListBoxes.mockResolvedValue([{ ...fakeBox, name: 'Updated' }]);

    await act(async () => {
      await result.current.updateBox('box-1', { name: 'Updated', roomId: 'room-1', status: 'packed' });
    });

    expect(mockUpdateBox).toHaveBeenCalledWith('box-1', { name: 'Updated', roomId: 'room-1', status: 'packed' });
    expect(result.current.boxes[0].name).toBe('Updated');
  });

  it('sets errorMessage and re-throws on failure', async () => {
    mockListBoxes.mockResolvedValue([]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateBox.mockRejectedValue(new Error('Update failed'));

    await act(async () => {
      await expect(
        result.current.updateBox('box-1', { name: 'Box', roomId: 'room-1', status: 'unpacked' }),
      ).rejects.toThrow('Update failed');
    });

    expect(result.current.errorMessage).toBe('Update failed');
    expect(result.current.isUpdating).toBe(false);
  });
});

describe('useBoxes – deleteBox', () => {
  it('sets isDeleting true during delete, then false', async () => {
    mockListBoxes.mockResolvedValue([fakeBox]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveDelete!: () => void;
    mockDeleteBox.mockReturnValue(new Promise<void>(r => { resolveDelete = r; }));
    mockListBoxes.mockResolvedValue([]);

    let deletePromise!: Promise<void>;
    act(() => {
      deletePromise = result.current.deleteBox('box-1');
    });

    expect(result.current.isDeleting).toBe(true);

    await act(async () => {
      resolveDelete();
      await deletePromise;
    });

    expect(result.current.isDeleting).toBe(false);
  });

  it('calls service with correct args and triggers refresh', async () => {
    mockListBoxes.mockResolvedValue([fakeBox]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockDeleteBox.mockResolvedValue(undefined);
    mockListBoxes.mockResolvedValue([]);

    await act(async () => {
      await result.current.deleteBox('box-1');
    });

    expect(mockDeleteBox).toHaveBeenCalledWith('box-1');
    expect(result.current.boxes).toHaveLength(0);
  });

  it('sets errorMessage and re-throws on failure', async () => {
    mockListBoxes.mockResolvedValue([fakeBox]);
    const { result } = renderHook(() => useBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockDeleteBox.mockRejectedValue(new Error('Delete failed'));

    await act(async () => {
      await expect(result.current.deleteBox('box-1')).rejects.toThrow('Delete failed');
    });

    expect(result.current.errorMessage).toBe('Delete failed');
    expect(result.current.isDeleting).toBe(false);
  });
});

describe('useBoxes – clearError', () => {
  it('resets errorMessage to null', async () => {
    mockListBoxes.mockRejectedValue(new Error('Load error'));
    const { result } = renderHook(() => useBoxes());

    await waitFor(() => expect(result.current.errorMessage).toBe('Load error'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.errorMessage).toBeNull();
  });
});
