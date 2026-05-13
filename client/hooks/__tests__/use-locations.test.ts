import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { LocationSummary } from '@/lib/location.service';
import { useLocations } from '@/hooks/use-locations';

const mockListLocationSummaries = jest.fn();
const mockCreateLocation = jest.fn();

jest.mock('@/lib/location.service', () => ({
  locationService: {
    listLocationSummaries: (...args: unknown[]) => mockListLocationSummaries(...args),
    createLocation: (...args: unknown[]) => mockCreateLocation(...args),
  },
}));

const fakeLocation: LocationSummary = {
  id: 'loc-1',
  name: 'My Home',
  address: null,
  kind: 'other',
  coverImageUrl: null,
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  rooms: 3,
  boxes: 10,
  packedBoxes: 5,
  deliveredBoxes: 2,
  unpackedAtDestinationBoxes: 1,
  items: 20,
  isOwner: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useLocations – initial state', () => {
  it('starts with isLoading true and empty locations', () => {
    mockListLocationSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useLocations());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.locations).toEqual([]);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe('useLocations – loading', () => {
  it('loads locations on mount', async () => {
    mockListLocationSummaries.mockResolvedValue([fakeLocation]);
    const { result } = renderHook(() => useLocations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.locations).toHaveLength(1);
    expect(result.current.locations[0]).toEqual(fakeLocation);
    expect(result.current.errorMessage).toBeNull();
  });

  it('sets errorMessage when load fails', async () => {
    mockListLocationSummaries.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useLocations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Network error');
    expect(result.current.locations).toEqual([]);
  });

  it('uses fallback message for non-Error rejections', async () => {
    mockListLocationSummaries.mockRejectedValue('oops');
    const { result } = renderHook(() => useLocations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Failed to load locations.');
  });
});

describe('useLocations – refresh', () => {
  it('sets isRefreshing (not isLoading) during refresh', async () => {
    mockListLocationSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveRefresh!: (v: LocationSummary[]) => void;
    mockListLocationSummaries.mockReturnValue(
      new Promise<LocationSummary[]>(r => { resolveRefresh = r; }),
    );

    act(() => {
      void result.current.refreshLocations();
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveRefresh([fakeLocation]);
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.locations).toHaveLength(1);
  });
});

describe('useLocations – createLocation', () => {
  it('sets isCreating true during create, then false', async () => {
    mockListLocationSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveCreate!: () => void;
    mockCreateLocation.mockReturnValue(new Promise<void>(r => { resolveCreate = r; }));
    mockListLocationSummaries.mockResolvedValue([]);

    let createPromise!: Promise<void>;
    act(() => {
      createPromise = result.current.createLocation('New Home');
    });

    expect(result.current.isCreating).toBe(true);

    await act(async () => {
      resolveCreate();
      await createPromise;
    });

    expect(result.current.isCreating).toBe(false);
  });

  it('calls service with correct name and triggers refresh', async () => {
    mockListLocationSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockCreateLocation.mockResolvedValue(undefined);
    mockListLocationSummaries.mockResolvedValue([fakeLocation]);

    await act(async () => {
      await result.current.createLocation('My Home');
    });

    expect(mockCreateLocation).toHaveBeenCalledWith('My Home');
    expect(result.current.locations).toHaveLength(1);
  });

  it('sets errorMessage and re-throws on failure', async () => {
    mockListLocationSummaries.mockResolvedValue([]);
    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockCreateLocation.mockRejectedValue(new Error('Create failed'));

    await act(async () => {
      await expect(result.current.createLocation('Bad')).rejects.toThrow('Create failed');
    });

    expect(result.current.errorMessage).toBe('Create failed');
    expect(result.current.isCreating).toBe(false);
  });
});

describe('useLocations – clearError', () => {
  it('resets errorMessage to null', async () => {
    mockListLocationSummaries.mockRejectedValue(new Error('Load error'));
    const { result } = renderHook(() => useLocations());

    await waitFor(() => expect(result.current.errorMessage).toBe('Load error'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.errorMessage).toBeNull();
  });
});
