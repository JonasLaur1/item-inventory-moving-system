import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { RoomSummary } from '@/lib/room.service';
import { useRooms } from '@/hooks/use-rooms';

const mockListRoomSummaries = jest.fn();
const mockCreateRoom = jest.fn();
const mockUpdateRoom = jest.fn();
const mockDeleteRoom = jest.fn();

jest.mock('@/lib/room.service', () => ({
  roomService: {
    listRoomSummaries: (...args: unknown[]) => mockListRoomSummaries(...args),
    createRoom: (...args: unknown[]) => mockCreateRoom(...args),
    updateRoom: (...args: unknown[]) => mockUpdateRoom(...args),
    deleteRoom: (...args: unknown[]) => mockDeleteRoom(...args),
  },
}));

const fakeRoom: RoomSummary = {
  id: 'room-1',
  locationId: 'loc-1',
  locationName: 'My Home',
  name: 'Kitchen',
  coverImageUrl: null,
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  boxes: 2,
  packedBoxes: 1,
  items: 5,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRooms – initial state', () => {
  it('starts with isLoading true and empty rooms', () => {
    mockListRoomSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useRooms());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.rooms).toEqual([]);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe('useRooms – loading', () => {
  it('loads rooms on mount', async () => {
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);
    const { result } = renderHook(() => useRooms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rooms).toHaveLength(1);
    expect(result.current.rooms[0]).toEqual(fakeRoom);
    expect(result.current.errorMessage).toBeNull();
  });

  it('passes locationId to the service', async () => {
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);
    const { result } = renderHook(() => useRooms('loc-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListRoomSummaries).toHaveBeenCalledWith('loc-1');
  });

  it('sets errorMessage when load fails', async () => {
    mockListRoomSummaries.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useRooms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('DB error');
    expect(result.current.rooms).toEqual([]);
  });

  it('uses fallback message for non-Error rejections', async () => {
    mockListRoomSummaries.mockRejectedValue('oops');
    const { result } = renderHook(() => useRooms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Failed to load rooms.');
  });
});

describe('useRooms – refresh', () => {
  it('sets isRefreshing (not isLoading) during refresh', async () => {
    mockListRoomSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveRefresh!: (v: RoomSummary[]) => void;
    mockListRoomSummaries.mockReturnValue(
      new Promise<RoomSummary[]>(r => { resolveRefresh = r; }),
    );

    act(() => {
      void result.current.refreshRooms();
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveRefresh([fakeRoom]);
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.rooms).toHaveLength(1);
  });
});

describe('useRooms – createRoom', () => {
  it('sets isCreating true during create, then false', async () => {
    mockListRoomSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveCreate!: (v: string) => void;
    mockCreateRoom.mockReturnValue(new Promise<string>(r => { resolveCreate = r; }));
    mockListRoomSummaries.mockResolvedValue([]);

    let createPromise!: Promise<string>;
    act(() => {
      createPromise = result.current.createRoom({ locationId: 'loc-1', name: 'Kitchen' });
    });

    expect(result.current.isCreating).toBe(true);

    await act(async () => {
      resolveCreate('room-id');
      await createPromise;
    });

    expect(result.current.isCreating).toBe(false);
  });

  it('calls service with correct args and returns roomId', async () => {
    mockListRoomSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockCreateRoom.mockResolvedValue('new-room-id');
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);

    let returnedId!: string;
    await act(async () => {
      returnedId = await result.current.createRoom({ locationId: 'loc-1', name: 'Kitchen' });
    });

    expect(mockCreateRoom).toHaveBeenCalledWith({ locationId: 'loc-1', name: 'Kitchen' });
    expect(returnedId).toBe('new-room-id');
    expect(result.current.rooms).toHaveLength(1);
  });

  it('sets errorMessage and re-throws on failure', async () => {
    mockListRoomSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockCreateRoom.mockRejectedValue(new Error('Create failed'));

    await act(async () => {
      await expect(
        result.current.createRoom({ locationId: 'loc-1', name: 'Kitchen' }),
      ).rejects.toThrow('Create failed');
    });

    expect(result.current.errorMessage).toBe('Create failed');
    expect(result.current.isCreating).toBe(false);
  });
});

describe('useRooms – updateRoom', () => {
  it('sets isUpdating true during update, then false', async () => {
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveUpdate!: () => void;
    mockUpdateRoom.mockReturnValue(new Promise<void>(r => { resolveUpdate = r; }));
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);

    let updatePromise!: Promise<void>;
    act(() => {
      updatePromise = result.current.updateRoom('room-1', { name: 'Living Room' });
    });

    expect(result.current.isUpdating).toBe(true);

    await act(async () => {
      resolveUpdate();
      await updatePromise;
    });

    expect(result.current.isUpdating).toBe(false);
  });

  it('calls service with correct args and triggers refresh', async () => {
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateRoom.mockResolvedValue(undefined);
    mockListRoomSummaries.mockResolvedValue([{ ...fakeRoom, name: 'Living Room' }]);

    await act(async () => {
      await result.current.updateRoom('room-1', { name: 'Living Room' });
    });

    expect(mockUpdateRoom).toHaveBeenCalledWith('room-1', { name: 'Living Room' });
    expect(result.current.rooms[0].name).toBe('Living Room');
  });

  it('sets errorMessage and re-throws on failure', async () => {
    mockListRoomSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateRoom.mockRejectedValue(new Error('Update failed'));

    await act(async () => {
      await expect(
        result.current.updateRoom('room-1', { name: 'New Name' }),
      ).rejects.toThrow('Update failed');
    });

    expect(result.current.errorMessage).toBe('Update failed');
    expect(result.current.isUpdating).toBe(false);
  });
});

describe('useRooms – deleteRoom', () => {
  it('sets isDeleting true during delete, then false', async () => {
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveDelete!: () => void;
    mockDeleteRoom.mockReturnValue(new Promise<void>(r => { resolveDelete = r; }));
    mockListRoomSummaries.mockResolvedValue([]);

    let deletePromise!: Promise<void>;
    act(() => {
      deletePromise = result.current.deleteRoom('room-1');
    });

    expect(result.current.isDeleting).toBe(true);

    await act(async () => {
      resolveDelete();
      await deletePromise;
    });

    expect(result.current.isDeleting).toBe(false);
  });

  it('calls service with correct args and triggers refresh', async () => {
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockDeleteRoom.mockResolvedValue(undefined);
    mockListRoomSummaries.mockResolvedValue([]);

    await act(async () => {
      await result.current.deleteRoom('room-1');
    });

    expect(mockDeleteRoom).toHaveBeenCalledWith('room-1');
    expect(result.current.rooms).toHaveLength(0);
  });

  it('sets errorMessage and re-throws on failure', async () => {
    mockListRoomSummaries.mockResolvedValue([fakeRoom]);
    const { result } = renderHook(() => useRooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockDeleteRoom.mockRejectedValue(new Error('Delete failed'));

    await act(async () => {
      await expect(result.current.deleteRoom('room-1')).rejects.toThrow('Delete failed');
    });

    expect(result.current.errorMessage).toBe('Delete failed');
    expect(result.current.isDeleting).toBe(false);
  });
});

describe('useRooms – clearError', () => {
  it('resets errorMessage to null', async () => {
    mockListRoomSummaries.mockRejectedValue(new Error('Load error'));
    const { result } = renderHook(() => useRooms());

    await waitFor(() => expect(result.current.errorMessage).toBe('Load error'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.errorMessage).toBeNull();
  });
});
