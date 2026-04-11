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
import { locationService } from '@/lib/location.service';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

function makeMockChain(result: Record<string, unknown> = { data: null, error: null }) {
  const self: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'order', 'limit', 'ilike']) {
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

const fakeLocation = {
  id: LOCATION_ID,
  user_id: USER_ID,
  name: 'My Home',
  address: '123 Main St',
  kind: 'start',
  cover_image_url: null,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
});

describe('locationService.listLocationSummaries', () => {
  it('returns empty array when no locations exist', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: [], error: null }));

    const result = await locationService.listLocationSummaries();
    expect(result).toEqual([]);
  });

  it('returns mapped location summaries', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') return makeMockChain({ data: [fakeLocation], error: null });
      if (table === 'rooms') return makeMockChain({ data: [], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await locationService.listLocationSummaries();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: LOCATION_ID,
      name: 'My Home',
      kind: 'start',
      isOwner: true,
      rooms: 0,
      boxes: 0,
      items: 0,
    });
  });

  it('throws when query returns an error', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: new Error('db error') }));

    await expect(locationService.listLocationSummaries()).rejects.toThrow('db error');
  });
});

describe('locationService.createLocation', () => {
  it('throws when name is empty string', async () => {
    await expect(locationService.createLocation('   ')).rejects.toThrow('Location name is required.');
  });

  it('throws when name in object input is empty', async () => {
    await expect(locationService.createLocation({ name: '' })).rejects.toThrow('Location name is required.');
  });

  it('creates location and returns id', async () => {
    const siblingChain = makeMockChain({ data: [], error: null });
    const insertChain = makeMockChain({ data: { id: 'new-loc-1' }, error: null });

    mockFrom
      .mockReturnValueOnce(siblingChain)
      .mockReturnValueOnce(insertChain);

    const result = await locationService.createLocation('New Place');
    expect(result).toEqual({ id: 'new-loc-1' });
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Place', user_id: USER_ID }),
    );
  });

  it('resolves unique name when sibling with same name exists', async () => {
    const siblingChain = makeMockChain({ data: [{ name: 'New Place' }], error: null });
    const insertChain = makeMockChain({ data: { id: 'new-loc-2' }, error: null });

    mockFrom
      .mockReturnValueOnce(siblingChain)
      .mockReturnValueOnce(insertChain);

    await locationService.createLocation('New Place');

    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.name).toBe('New Place #2');
  });

  it('throws when insert returns error', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: new Error('insert error') }));

    await expect(locationService.createLocation('New Place')).rejects.toThrow('insert error');
  });

  it('throws when insert returns no id', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(locationService.createLocation('New Place')).rejects.toThrow('Failed to create location.');
  });
});

describe('locationService.updateLocation', () => {
  it('throws when locationId is empty', async () => {
    await expect(locationService.updateLocation('   ', { name: 'New Name' })).rejects.toThrow(
      'Location id is required.',
    );
  });

  it('throws when location is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(locationService.updateLocation(LOCATION_ID, { name: 'X' })).rejects.toThrow(
      'Location not found.',
    );
  });

  it('updates location and resolves', async () => {
    const fetchChain = makeMockChain({
      data: { id: LOCATION_ID, name: 'Old Name', kind: 'other', sort_order: 0, cover_image_url: null, address: null },
      error: null,
    });
    const updateChain = makeMockChain({ data: { id: LOCATION_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    await expect(locationService.updateLocation(LOCATION_ID, { name: 'New Name' })).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
  });

  it('returns early without a second DB call when no fields provided', async () => {
    const fetchChain = makeMockChain({
      data: { id: LOCATION_ID, name: 'Same', kind: 'other', sort_order: 0, cover_image_url: null, address: null },
      error: null,
    });
    mockFrom.mockReturnValueOnce(fetchChain);

    await expect(locationService.updateLocation(LOCATION_ID, {})).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe('locationService.deleteLocation', () => {
  it('throws when locationId is empty', async () => {
    await expect(locationService.deleteLocation('   ')).rejects.toThrow('Location id is required.');
  });

  it('throws when location is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(locationService.deleteLocation(LOCATION_ID)).rejects.toThrow('Location not found.');
  });

  it('deletes location successfully', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID }, error: null }));

    await expect(locationService.deleteLocation(LOCATION_ID)).resolves.toBeUndefined();
  });

  it('throws friendly error on foreign key violation', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: { code: '23503', message: 'fk violation' } }));

    await expect(locationService.deleteLocation(LOCATION_ID)).rejects.toThrow(
      'Location has rooms. Remove or move its rooms before deleting it.',
    );
  });
});

describe('locationService.getLocationDetails', () => {
  it('throws when locationId is empty', async () => {
    await expect(locationService.getLocationDetails('   ')).rejects.toThrow('Location id is required.');
  });

  it('throws when location is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(locationService.getLocationDetails(LOCATION_ID)).rejects.toThrow('Location not found.');
  });

  it('returns location details with empty roomList and boxList when no rooms', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') return makeMockChain({ data: fakeLocation, error: null });
      if (table === 'rooms') return makeMockChain({ data: [], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await locationService.getLocationDetails(LOCATION_ID);

    expect(result.id).toBe(LOCATION_ID);
    expect(result.roomList).toEqual([]);
    expect(result.boxList).toEqual([]);
  });
});

describe('locationService – getCurrentUserId null user', () => {
  it('throws when getUser returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(locationService.listLocationSummaries()).rejects.toThrow('No authenticated user found.');
  });
});

describe('locationService.listLocationSummaries – with rooms, boxes, and items', () => {
  it('aggregates packed, delivered, and item counts', async () => {
    const roomRow = { id: 'room-1', location_id: LOCATION_ID, name: 'Kitchen', cover_image_url: null, sort_order: 0, created_at: null, updated_at: null };
    const boxRow1 = { id: 'box-1', room_id: 'room-1', status: 'packed', updated_at: null, fragility: 'fragile', name: 'Box 1' };
    const boxRow2 = { id: 'box-2', room_id: 'room-1', status: 'delivered', updated_at: null, fragility: null, name: 'Box 2' };
    const boxRow3 = { id: 'box-3', room_id: 'room-1', status: 'unpacked_at_destination', updated_at: null, fragility: null, name: 'Box 3' };
    const itemRow = { box_id: 'box-1', quantity: 4 };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') return makeMockChain({ data: [fakeLocation], error: null });
      if (table === 'rooms') return makeMockChain({ data: [roomRow], error: null });
      if (table === 'boxes') return makeMockChain({ data: [boxRow1, boxRow2, boxRow3], error: null });
      if (table === 'items') return makeMockChain({ data: [itemRow], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await locationService.listLocationSummaries();

    expect(result).toHaveLength(1);
    expect(result[0].packedBoxes).toBe(1);
    expect(result[0].deliveredBoxes).toBeGreaterThanOrEqual(1);
    expect(result[0].unpackedAtDestinationBoxes).toBe(1);
    expect(result[0].items).toBe(4);
  });
});

describe('locationService.getLocationDetails – with rooms and boxes', () => {
  it('returns roomList and boxList populated from aggregation', async () => {
    const roomRow = { id: 'room-1', location_id: LOCATION_ID, name: 'Kitchen', cover_image_url: null, sort_order: 0, created_at: null, updated_at: null };
    const boxRow = { id: 'box-1', room_id: 'room-1', status: 'packed', updated_at: null, fragility: 'fragile', name: null };
    const itemRow = { box_id: 'box-1', quantity: 2 };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') return makeMockChain({ data: fakeLocation, error: null });
      if (table === 'rooms') return makeMockChain({ data: [roomRow], error: null });
      if (table === 'boxes') return makeMockChain({ data: [boxRow], error: null });
      if (table === 'items') return makeMockChain({ data: [itemRow], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await locationService.getLocationDetails(LOCATION_ID);

    expect(result.roomList).toHaveLength(1);
    expect(result.roomList[0].packedBoxes).toBe(1);
    expect(result.boxList).toHaveLength(1);
    // box.name is null → falls back to "Box #1"
    expect(result.boxList[0].name).toBe('Box #1');
    expect(result.boxList[0].isFragile).toBe(true);
    expect(result.boxList[0].itemsCount).toBe(2);
  });
});

describe('locationService.updateLocation – field-specific updates and edge cases', () => {
  it('updates kind when provided', async () => {
    const fetchChain = makeMockChain({
      data: { id: LOCATION_ID, name: 'Old Name', kind: 'other', sort_order: 0, cover_image_url: null, address: null },
      error: null,
    });
    const updateChain = makeMockChain({ data: { id: LOCATION_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    await expect(locationService.updateLocation(LOCATION_ID, { kind: 'start' })).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ kind: 'start' }));
  });

  it('updates sortOrder when provided', async () => {
    const fetchChain = makeMockChain({
      data: { id: LOCATION_ID, name: 'Old Name', kind: 'other', sort_order: 0, cover_image_url: null, address: null },
      error: null,
    });
    const updateChain = makeMockChain({ data: { id: LOCATION_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    await expect(locationService.updateLocation(LOCATION_ID, { sortOrder: 5 })).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 5 }));
  });

  it('throws when update returns no data', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({
        data: { id: LOCATION_ID, name: 'Old', kind: 'other', sort_order: 0, cover_image_url: null, address: null },
        error: null,
      }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(locationService.updateLocation(LOCATION_ID, { name: 'New' })).rejects.toThrow('Location not found.');
  });
});

describe('locationService.deleteLocation – error paths', () => {
  it('throws non-FK errors from delete', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: { code: '42501', message: 'permission denied' } }));

    await expect(locationService.deleteLocation(LOCATION_ID)).rejects.toMatchObject({ message: 'permission denied' });
  });

  it('throws when delete returns no data', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(locationService.deleteLocation(LOCATION_ID)).rejects.toThrow('Location not found.');
  });
});

describe('locationService.updateLocationAddress', () => {
  it('delegates to updateLocation with only address', async () => {
    const fetchChain = makeMockChain({
      data: { id: LOCATION_ID, name: 'My Home', kind: 'other', sort_order: 0, cover_image_url: null, address: null },
      error: null,
    });
    const updateChain = makeMockChain({ data: { id: LOCATION_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    await expect(locationService.updateLocationAddress(LOCATION_ID, '123 Main St')).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ address: '123 Main St' }));
  });
});

describe('locationService.updateLocationName', () => {
  it('delegates to updateLocation with only name', async () => {
    const fetchChain = makeMockChain({
      data: { id: LOCATION_ID, name: 'Old', kind: 'other', sort_order: 0, cover_image_url: null, address: null },
      error: null,
    });
    const updateChain = makeMockChain({ data: { id: LOCATION_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    await expect(locationService.updateLocationName(LOCATION_ID, 'New Name')).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
  });
});
