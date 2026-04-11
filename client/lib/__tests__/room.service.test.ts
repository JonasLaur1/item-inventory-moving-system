jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('@/lib/activity.service', () => ({
  activityService: {
    writeActivitySafely: jest.fn().mockResolvedValue(undefined),
  },
}));

import { supabase } from '@/lib/supabase';
import { roomService } from '@/lib/room.service';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

function makeMockChain(result: Record<string, unknown> = { data: null, error: null }) {
  const self: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'ilike']) {
    self[m] = jest.fn().mockReturnValue(self);
  }
  self.maybeSingle = jest.fn().mockResolvedValue(result);
  self.single = jest.fn().mockResolvedValue(result);
  self.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
  self.catch = (rej: any) => Promise.resolve(result).catch(rej);
  return self;
}

const USER_ID = 'user-abc';
const LOCATION_ID = 'loc-1';
const ROOM_ID = 'room-1';

const fakeRoom = {
  id: ROOM_ID,
  location_id: LOCATION_ID,
  name: 'Kitchen',
  cover_image_url: null,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
});

describe('roomService.listRoomSummaries', () => {
  it('returns empty array when no rooms exist', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: [], error: null }));

    const result = await roomService.listRoomSummaries();
    expect(result).toEqual([]);
  });

  it('returns mapped room summaries', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') return makeMockChain({ data: [fakeRoom], error: null });
      if (table === 'locations') return makeMockChain({ data: [{ id: LOCATION_ID, name: 'My Home' }], error: null });
      if (table === 'boxes') return makeMockChain({ data: [], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await roomService.listRoomSummaries();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: ROOM_ID,
      name: 'Kitchen',
      locationId: LOCATION_ID,
      locationName: 'My Home',
      boxes: 0,
      packedBoxes: 0,
      items: 0,
    });
  });

  it('filters by locationId when provided', async () => {
    const roomChain = makeMockChain({ data: [], error: null });
    mockFrom.mockReturnValue(roomChain);

    await roomService.listRoomSummaries(LOCATION_ID);

    expect(roomChain.eq).toHaveBeenCalledWith('location_id', LOCATION_ID);
  });

  it('throws when query returns an error', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: new Error('query failed') }));

    await expect(roomService.listRoomSummaries()).rejects.toThrow('query failed');
  });
});

describe('roomService.createRoom', () => {
  it('throws when locationId is empty', async () => {
    await expect(roomService.createRoom({ locationId: '   ', name: 'Kitchen' })).rejects.toThrow(
      'Location is required.',
    );
  });

  it('throws when name is empty', async () => {
    await expect(roomService.createRoom({ locationId: LOCATION_ID, name: '   ' })).rejects.toThrow(
      'Room name is required.',
    );
  });

  it('throws when location is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(roomService.createRoom({ locationId: LOCATION_ID, name: 'Kitchen' })).rejects.toThrow(
      'Location not found.',
    );
  });

  it('creates room and returns id', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: 'new-room-1' }, error: null }));

    const result = await roomService.createRoom({ locationId: LOCATION_ID, name: 'Kitchen' });
    expect(result).toBe('new-room-1');
  });

  it('resolves unique name when sibling already exists', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-room-2' }, error: null });
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [{ name: 'Kitchen' }], error: null }))
      .mockReturnValueOnce(insertChain);

    await roomService.createRoom({ locationId: LOCATION_ID, name: 'Kitchen' });

    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.name).toBe('Kitchen #2');
  });
});

describe('roomService.getRoomDetails', () => {
  it('throws when roomId is empty', async () => {
    await expect(roomService.getRoomDetails('   ')).rejects.toThrow('Room id is required.');
  });

  it('throws when room is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(roomService.getRoomDetails(ROOM_ID)).rejects.toThrow('Room not found.');
  });

  it('returns room details with empty boxList', async () => {
    // getRoomDetails calls from() in this order:
    // 1. rooms (fetch room)
    // 2. locations (getLocationNameMap — expects array)
    // 3. boxes (fetch boxes for room)
    // 4. locations (isOwner check — uses maybeSingle, expects single object)
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeRoom, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [{ id: LOCATION_ID, name: 'My Home' }], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { user_id: USER_ID }, error: null }));

    const result = await roomService.getRoomDetails(ROOM_ID);

    expect(result.id).toBe(ROOM_ID);
    expect(result.name).toBe('Kitchen');
    expect(result.isOwner).toBe(true);
    expect(result.boxList).toEqual([]);
  });
});

describe('roomService.updateRoom', () => {
  it('throws when roomId is empty', async () => {
    await expect(roomService.updateRoom('   ', { name: 'New' })).rejects.toThrow('Room id is required.');
  });

  it('throws when room is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(roomService.updateRoom(ROOM_ID, { name: 'New' })).rejects.toThrow('Room not found.');
  });

  it('updates room name successfully', async () => {
    const updateChain = makeMockChain({ data: { id: ROOM_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(updateChain);

    await expect(roomService.updateRoom(ROOM_ID, { name: 'Dining Room' })).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dining Room' }));
  });
});

describe('roomService.deleteRoom', () => {
  it('throws when roomId is empty', async () => {
    await expect(roomService.deleteRoom('   ')).rejects.toThrow('Room id is required.');
  });

  it('throws when room is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(roomService.deleteRoom(ROOM_ID)).rejects.toThrow('Room not found.');
  });

  it('deletes room successfully', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID }, error: null }));

    await expect(roomService.deleteRoom(ROOM_ID)).resolves.toBeUndefined();
  });

  it('throws friendly error on foreign key violation', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: { code: '23503', message: 'fk violation' } }));

    await expect(roomService.deleteRoom(ROOM_ID)).rejects.toThrow(
      'Room has boxes. Remove or move its boxes before deleting it.',
    );
  });
});

describe('roomService – getCurrentUserId null user', () => {
  it('throws when getUser returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(roomService.listRoomSummaries()).rejects.toThrow('No authenticated user found.');
  });
});

describe('roomService.listRoomSummaries – with boxes and items', () => {
  it('counts packed boxes and items when boxes exist', async () => {
    const boxRow = { id: 'box-1', room_id: ROOM_ID, status: 'packed', updated_at: null, fragility: 'fragile', name: 'Box 1' };
    const itemRow = { box_id: 'box-1', quantity: 3 };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') return makeMockChain({ data: [fakeRoom], error: null });
      if (table === 'locations') return makeMockChain({ data: [{ id: LOCATION_ID, name: 'My Home' }], error: null });
      if (table === 'boxes') return makeMockChain({ data: [boxRow], error: null });
      if (table === 'items') return makeMockChain({ data: [itemRow], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await roomService.listRoomSummaries();
    expect(result).toHaveLength(1);
    expect(result[0].packedBoxes).toBe(1);
    expect(result[0].items).toBe(3);
  });
});

describe('roomService.createRoom – insert edge cases', () => {
  it('throws when insert returns error', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: new Error('insert error') }));

    await expect(roomService.createRoom({ locationId: LOCATION_ID, name: 'Kitchen' })).rejects.toThrow('insert error');
  });

  it('throws when insert returns no id', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(roomService.createRoom({ locationId: LOCATION_ID, name: 'Kitchen' })).rejects.toThrow('Failed to create room.');
  });
});

describe('roomService.getRoomDetails – with boxes and items', () => {
  it('returns boxList with isFragile true and correct item counts', async () => {
    const boxRow = { id: 'box-1', room_id: ROOM_ID, status: 'packed', updated_at: null, fragility: 'fragile', name: 'Box 1' };
    const itemRow = { box_id: 'box-1', quantity: 5 };

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeRoom, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [{ id: LOCATION_ID, name: 'My Home' }], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [boxRow], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { user_id: USER_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [itemRow], error: null }));

    const result = await roomService.getRoomDetails(ROOM_ID);

    expect(result.boxList).toHaveLength(1);
    expect(result.boxList[0].isFragile).toBe(true);
    expect(result.boxList[0].itemsCount).toBe(5);
  });
});

describe('roomService.updateRoom – validation and edge cases', () => {
  it('throws when name is empty string', async () => {
    await expect(roomService.updateRoom(ROOM_ID, { name: '   ' })).rejects.toThrow('Room name is required.');
  });

  it('throws when locationId is empty string', async () => {
    await expect(roomService.updateRoom(ROOM_ID, { locationId: '   ' })).rejects.toThrow('Location is required.');
  });

  it('returns early when updates object is empty (no name or locationId provided)', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }));

    await expect(roomService.updateRoom(ROOM_ID, {})).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('sets location_id in updates when locationId is provided', async () => {
    const updateChain = makeMockChain({ data: { id: ROOM_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(updateChain);

    await expect(roomService.updateRoom(ROOM_ID, { locationId: LOCATION_ID })).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ location_id: LOCATION_ID }));
  });

  it('throws when update returns no data', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(roomService.updateRoom(ROOM_ID, { name: 'New Name' })).rejects.toThrow('Room not found.');
  });
});

describe('roomService.deleteRoom – error paths', () => {
  it('throws non-FK errors from delete', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: { code: '42501', message: 'permission denied' } }));

    await expect(roomService.deleteRoom(ROOM_ID)).rejects.toMatchObject({ message: 'permission denied' });
  });

  it('throws when delete returns no data', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(roomService.deleteRoom(ROOM_ID)).rejects.toThrow('Room not found.');
  });
});

describe('roomService.updateRoomName', () => {
  it('delegates to updateRoom with only name', async () => {
    const updateChain = makeMockChain({ data: { id: ROOM_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(updateChain);

    await expect(roomService.updateRoomName(ROOM_ID, 'Dining Room')).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dining Room' }));
  });
});
