jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
import { activityService } from '@/lib/activity.service';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

function makeMockChain(result: Record<string, unknown> = { data: null, error: null }) {
  const self: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit', 'ilike']) {
    self[m] = jest.fn().mockReturnValue(self);
  }
  self.maybeSingle = jest.fn().mockResolvedValue(result);
  self.single = jest.fn().mockResolvedValue(result);
  self.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
  self.catch = (rej: any) => Promise.resolve(result).catch(rej);
  return self;
}

const USER_ID = 'user-abc';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
});

describe('activityService.writeActivity', () => {
  it('inserts a row into activity_log on success', async () => {
    const chain = makeMockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await expect(
      activityService.writeActivity({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: 'Box created',
        description: 'Created a box.',
      }),
    ).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('activity_log');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, type: 'Created' }),
    );
  });

  it('throws when getUser returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('auth error') });

    await expect(
      activityService.writeActivity({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: 'Title',
        description: 'Desc',
      }),
    ).rejects.toThrow('auth error');
  });

  it('throws when no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      activityService.writeActivity({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: 'Title',
        description: 'Desc',
      }),
    ).rejects.toThrow('No authenticated user found.');
  });

  it('throws when entityId is blank', async () => {
    mockFrom.mockReturnValue(makeMockChain({ error: null }));

    await expect(
      activityService.writeActivity({
        type: 'Created',
        entityType: 'box',
        entityId: '   ',
        title: 'Title',
        description: 'Desc',
      }),
    ).rejects.toThrow('Activity entity id is required.');
  });

  it('throws when title is blank', async () => {
    mockFrom.mockReturnValue(makeMockChain({ error: null }));

    await expect(
      activityService.writeActivity({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: '   ',
        description: 'Desc',
      }),
    ).rejects.toThrow('Activity title is required.');
  });

  it('throws when description is blank', async () => {
    mockFrom.mockReturnValue(makeMockChain({ error: null }));

    await expect(
      activityService.writeActivity({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: 'Title',
        description: '   ',
      }),
    ).rejects.toThrow('Activity description is required.');
  });

  it('throws when insert returns an error', async () => {
    const chain = makeMockChain({ error: new Error('db error') });
    mockFrom.mockReturnValue(chain);

    await expect(
      activityService.writeActivity({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: 'Title',
        description: 'Desc',
      }),
    ).rejects.toThrow('db error');
  });

  it('sets correct entity id columns based on entityType', async () => {
    const chain = makeMockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await activityService.writeActivity({
      type: 'Created',
      entityType: 'room',
      entityId: 'room-1',
      title: 'Room created',
      description: 'Created a room.',
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ room_id: 'room-1', box_id: null, item_id: null, location_id: null }),
    );
  });

  it('includes optional meta fields when provided', async () => {
    const chain = makeMockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await activityService.writeActivity({
      type: 'Created',
      entityType: 'box',
      entityId: 'box-1',
      title: 'Title',
      description: 'Desc',
      locationName: 'Home',
      roomName: 'Kitchen',
      boxName: 'Box #1',
    });

    const insertCall = chain.insert.mock.calls[0][0];
    expect(insertCall.meta).toMatchObject({
      locationName: 'Home',
      roomName: 'Kitchen',
      boxName: 'Box #1',
    });
  });
});

describe('activityService.writeActivitySafely', () => {
  it('resolves without throwing when writeActivity succeeds', async () => {
    mockFrom.mockReturnValue(makeMockChain({ error: null }));

    await expect(
      activityService.writeActivitySafely({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: 'Title',
        description: 'Desc',
      }),
    ).resolves.toBeUndefined();
  });

  it('swallows errors instead of throwing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('auth fail') });

    await expect(
      activityService.writeActivitySafely({
        type: 'Created',
        entityType: 'box',
        entityId: 'box-1',
        title: 'Title',
        description: 'Desc',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('activityService.listRecentActivity', () => {
  const activityRow = {
    id: 'evt-1',
    type: 'Created',
    meta: {
      entityType: 'box',
      entityId: 'box-1',
      title: 'Box created',
      description: 'Created a box.',
      locationName: 'Home',
    },
    created_at: '2024-01-01T00:00:00Z',
    user_id: USER_ID,
  };

  it('returns an empty array when no activity rows exist', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: [], error: null }));

    const result = await activityService.listRecentActivity();
    expect(result).toEqual([]);
  });

  it('returns mapped ActivityFeedEvent objects', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: [activityRow], error: null }));

    const result = await activityService.listRecentActivity();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'evt-1',
      type: 'Created',
      title: 'Box created',
      description: 'Created a box.',
      location: 'Home',
      entityType: 'box',
      entityId: 'box-1',
      isOwnEvent: true,
      actorName: null,
    });
  });

  it('throws when query returns an error', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: new Error('query failed') }));

    await expect(activityService.listRecentActivity()).rejects.toThrow('query failed');
  });

  it('fetches profiles for other users and sets actorName', async () => {
    const rowFromOther = { ...activityRow, id: 'evt-2', user_id: 'other-user' };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'activity_log') return makeMockChain({ data: [rowFromOther], error: null });
      if (table === 'profiles') {
        return makeMockChain({ data: [{ id: 'other-user', display_name: 'Alice' }], error: null });
      }
      return makeMockChain({ data: [], error: null });
    });

    const result = await activityService.listRecentActivity();

    expect(result[0].actorName).toBe('Alice');
    expect(result[0].isOwnEvent).toBe(false);
  });

  it('marks event as own when user_id matches current user', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: [activityRow], error: null }));

    const result = await activityService.listRecentActivity();
    expect(result[0].isOwnEvent).toBe(true);
    expect(result[0].actorName).toBeNull();
  });

  it('normalises unknown activity type to "Updated"', async () => {
    const row = { ...activityRow, type: 'unknown_type' };
    mockFrom.mockReturnValue(makeMockChain({ data: [row], error: null }));

    const result = await activityService.listRecentActivity();
    expect(result[0].type).toBe('Updated');
  });

  it('falls back to "Unknown location" when locationName is absent', async () => {
    const row = {
      ...activityRow,
      meta: { entityType: 'box', entityId: 'box-1', title: 'T', description: 'D' },
    };
    mockFrom.mockReturnValue(makeMockChain({ data: [row], error: null }));

    const result = await activityService.listRecentActivity();
    expect(result[0].location).toBe('Unknown location');
  });
});
