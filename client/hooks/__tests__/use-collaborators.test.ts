import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { CollaboratorEntry } from '@/lib/collaborator.service';
import { useCollaborators } from '@/hooks/use-collaborators';

const mockListCollaborators = jest.fn();
const mockAddCollaboratorByEmail = jest.fn();
const mockRemoveCollaborator = jest.fn();

jest.mock('@/lib/collaborator.service', () => ({
  collaboratorService: {
    listCollaborators: (...args: unknown[]) => mockListCollaborators(...args),
    addCollaboratorByEmail: (...args: unknown[]) => mockAddCollaboratorByEmail(...args),
    removeCollaborator: (...args: unknown[]) => mockRemoveCollaborator(...args),
  },
}));

const LOCATION_ID = 'loc-1';

const fakeCollaborator: CollaboratorEntry = {
  id: 'collab-row-1',
  collaboratorId: 'user-bob',
  displayName: 'Bob',
  addedAt: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCollaborators – initial state', () => {
  it('starts with isLoading true and empty collaborators', () => {
    mockListCollaborators.mockResolvedValue([]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.collaborators).toEqual([]);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isAdding).toBe(false);
    expect(result.current.isRemoving).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe('useCollaborators – loading', () => {
  it('loads collaborators on mount', async () => {
    mockListCollaborators.mockResolvedValue([fakeCollaborator]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.collaborators).toHaveLength(1);
    expect(result.current.collaborators[0]).toEqual(fakeCollaborator);
    expect(result.current.errorMessage).toBeNull();
  });

  it('passes locationId to the service', async () => {
    mockListCollaborators.mockResolvedValue([]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListCollaborators).toHaveBeenCalledWith(LOCATION_ID);
  });

  it('sets errorMessage when load fails', async () => {
    mockListCollaborators.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('DB error');
    expect(result.current.collaborators).toEqual([]);
  });

  it('uses fallback message for non-Error rejections', async () => {
    mockListCollaborators.mockRejectedValue('oops');
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Failed to load collaborators.');
  });
});

describe('useCollaborators – refresh', () => {
  it('sets isRefreshing (not isLoading) during refresh', async () => {
    mockListCollaborators.mockResolvedValue([]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveRefresh!: (v: CollaboratorEntry[]) => void;
    mockListCollaborators.mockReturnValue(
      new Promise<CollaboratorEntry[]>(r => { resolveRefresh = r; }),
    );

    act(() => {
      void result.current.refresh();
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveRefresh([fakeCollaborator]);
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.collaborators).toHaveLength(1);
  });
});

describe('useCollaborators – addByEmail', () => {
  it('sets isAdding true during add, then false', async () => {
    mockListCollaborators.mockResolvedValue([]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveAdd!: () => void;
    mockAddCollaboratorByEmail.mockReturnValue(new Promise<void>(r => { resolveAdd = r; }));
    mockListCollaborators.mockResolvedValue([]);

    let addPromise!: Promise<void>;
    act(() => {
      addPromise = result.current.addByEmail('bob@example.com');
    });

    expect(result.current.isAdding).toBe(true);

    await act(async () => {
      resolveAdd();
      await addPromise;
    });

    expect(result.current.isAdding).toBe(false);
  });

  it('calls service with correct args and triggers refresh', async () => {
    mockListCollaborators.mockResolvedValue([]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockAddCollaboratorByEmail.mockResolvedValue(undefined);
    mockListCollaborators.mockResolvedValue([fakeCollaborator]);

    await act(async () => {
      await result.current.addByEmail('bob@example.com');
    });

    expect(mockAddCollaboratorByEmail).toHaveBeenCalledWith(LOCATION_ID, 'bob@example.com');
    expect(result.current.collaborators).toHaveLength(1);
  });

  it('re-throws on failure (does not set errorMessage)', async () => {
    mockListCollaborators.mockResolvedValue([]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockAddCollaboratorByEmail.mockRejectedValue(new Error('User not found'));

    await act(async () => {
      await expect(result.current.addByEmail('bad@example.com')).rejects.toThrow('User not found');
    });

    // useCollaborators does not set errorMessage for add failures — caller handles it
    expect(result.current.isAdding).toBe(false);
  });
});

describe('useCollaborators – remove', () => {
  it('sets isRemoving true during remove, then false', async () => {
    mockListCollaborators.mockResolvedValue([fakeCollaborator]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveRemove!: () => void;
    mockRemoveCollaborator.mockReturnValue(new Promise<void>(r => { resolveRemove = r; }));
    mockListCollaborators.mockResolvedValue([]);

    let removePromise!: Promise<void>;
    act(() => {
      removePromise = result.current.remove('user-bob');
    });

    expect(result.current.isRemoving).toBe(true);

    await act(async () => {
      resolveRemove();
      await removePromise;
    });

    expect(result.current.isRemoving).toBe(false);
  });

  it('calls service with correct args and triggers refresh', async () => {
    mockListCollaborators.mockResolvedValue([fakeCollaborator]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRemoveCollaborator.mockResolvedValue(undefined);
    mockListCollaborators.mockResolvedValue([]);

    await act(async () => {
      await result.current.remove('user-bob');
    });

    expect(mockRemoveCollaborator).toHaveBeenCalledWith(LOCATION_ID, 'user-bob');
    expect(result.current.collaborators).toHaveLength(0);
  });

  it('re-throws on failure', async () => {
    mockListCollaborators.mockResolvedValue([fakeCollaborator]);
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRemoveCollaborator.mockRejectedValue(new Error('Not found'));

    await act(async () => {
      await expect(result.current.remove('user-bob')).rejects.toThrow('Not found');
    });

    expect(result.current.isRemoving).toBe(false);
  });
});

describe('useCollaborators – clearError', () => {
  it('resets errorMessage to null', async () => {
    mockListCollaborators.mockRejectedValue(new Error('Load error'));
    const { result } = renderHook(() => useCollaborators(LOCATION_ID));

    await waitFor(() => expect(result.current.errorMessage).toBe('Load error'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.errorMessage).toBeNull();
  });
});
