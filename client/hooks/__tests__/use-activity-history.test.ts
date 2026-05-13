import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { ActivityFeedEvent } from '@/lib/activity.service';
import { useActivityHistory } from '@/hooks/use-activity-history';

const mockListRecentActivity = jest.fn();

jest.mock('@/lib/activity.service', () => ({
  activityService: {
    listRecentActivity: (...args: unknown[]) => mockListRecentActivity(...args),
  },
}));

const fakeEvent: ActivityFeedEvent = {
  id: 'evt-1',
  type: 'Created',
  title: 'Box created',
  description: 'Box #1 was created',
  location: 'My Home',
  room: 'Kitchen',
  box: 'Box #1',
  occurredAt: '2024-01-01T00:00:00Z',
  entityType: 'box',
  entityId: 'box-1',
  actorName: 'Alice',
  isOwnEvent: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useActivityHistory – initial state', () => {
  it('starts with isLoading true and empty events', () => {
    mockListRecentActivity.mockResolvedValue([]);
    const { result } = renderHook(() => useActivityHistory());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe('useActivityHistory – loading', () => {
  it('loads events on mount', async () => {
    mockListRecentActivity.mockResolvedValue([fakeEvent]);
    const { result } = renderHook(() => useActivityHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toEqual(fakeEvent);
    expect(result.current.errorMessage).toBeNull();
  });

  it('passes limit to the service (default 200)', async () => {
    mockListRecentActivity.mockResolvedValue([]);
    const { result } = renderHook(() => useActivityHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListRecentActivity).toHaveBeenCalledWith(200);
  });

  it('passes custom limit to the service', async () => {
    mockListRecentActivity.mockResolvedValue([]);
    const { result } = renderHook(() => useActivityHistory(50));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListRecentActivity).toHaveBeenCalledWith(50);
  });

  it('sets errorMessage when load fails', async () => {
    mockListRecentActivity.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useActivityHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('DB error');
    expect(result.current.events).toEqual([]);
  });

  it('uses fallback message for non-Error rejections', async () => {
    mockListRecentActivity.mockRejectedValue('oops');
    const { result } = renderHook(() => useActivityHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Failed to load activity history.');
  });
});

describe('useActivityHistory – refresh', () => {
  it('sets isRefreshing (not isLoading) during refresh', async () => {
    mockListRecentActivity.mockResolvedValue([]);
    const { result } = renderHook(() => useActivityHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveRefresh!: (v: ActivityFeedEvent[]) => void;
    mockListRecentActivity.mockReturnValue(
      new Promise<ActivityFeedEvent[]>(r => { resolveRefresh = r; }),
    );

    act(() => {
      void result.current.refreshActivity();
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveRefresh([fakeEvent]);
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.events).toHaveLength(1);
  });
});

describe('useActivityHistory – clearError', () => {
  it('resets errorMessage to null', async () => {
    mockListRecentActivity.mockRejectedValue(new Error('Load error'));
    const { result } = renderHook(() => useActivityHistory());

    await waitFor(() => expect(result.current.errorMessage).toBe('Load error'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.errorMessage).toBeNull();
  });
});
