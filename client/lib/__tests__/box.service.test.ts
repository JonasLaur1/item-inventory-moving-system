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
import { boxService } from '@/lib/box.service';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

function makeMockChain(result: Record<string, unknown> = { data: null, error: null }) {
  const self: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'ilike', 'head']) {
    self[m] = jest.fn().mockReturnValue(self);
  }
  self.maybeSingle = jest.fn().mockResolvedValue(result);
  self.single = jest.fn().mockResolvedValue(result);
  self.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
  self.catch = (rej: any) => Promise.resolve(result).catch(rej);
  return self;
}

const USER_ID = 'user-abc';
const BOX_ID = 'box-1';
const ROOM_ID = 'room-1';
const LOCATION_ID = 'loc-1';

const fakeRoom = {
  id: ROOM_ID,
  name: 'Kitchen',
  location_id: LOCATION_ID,
  location: { id: LOCATION_ID, name: 'My Home' },
};

const fakeBox = {
  id: BOX_ID,
  name: 'Box #1',
  status: 'unpacked',
  room_id: ROOM_ID,
  updated_at: '2024-01-01T00:00:00Z',
  fragility: 'normal',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
});

describe('boxService.listBoxes', () => {
  it('returns empty array when no boxes exist', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: [], error: null }));

    const result = await boxService.listBoxes();
    expect(result).toEqual([]);
  });

  it('returns mapped box summaries', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'boxes') return makeMockChain({ data: [fakeBox], error: null });
      if (table === 'items') return makeMockChain({ data: [], error: null });
      if (table === 'rooms') return makeMockChain({ data: [fakeRoom], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await boxService.listBoxes();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: BOX_ID, name: 'Box #1', status: 'unpacked', roomId: ROOM_ID });
  });

  it('throws when boxes query returns an error', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: new Error('db error') }));

    await expect(boxService.listBoxes()).rejects.toThrow('db error');
  });
});

describe('boxService.getBoxDetails', () => {
  it('throws when boxId is empty', async () => {
    await expect(boxService.getBoxDetails('   ')).rejects.toThrow('Box id is required.');
  });

  it('throws when box is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(boxService.getBoxDetails(BOX_ID)).rejects.toThrow('Box not found.');
  });

  it('returns box details with items', async () => {
    const fakeItem = { id: 'item-1', name: 'Plates', notes: null, quantity: 4, is_fragile: false, photo_url: null };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'boxes') return makeMockChain({ data: fakeBox, error: null });
      if (table === 'rooms') return makeMockChain({ data: [fakeRoom], error: null });
      if (table === 'items') return makeMockChain({ data: [fakeItem], error: null });
      return makeMockChain({ data: [], error: null });
    });

    const result = await boxService.getBoxDetails(BOX_ID);

    expect(result.id).toBe(BOX_ID);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 'item-1', name: 'Plates', quantity: 4 });
  });
});

describe('boxService.createBox', () => {
  it('throws when name is empty', async () => {
    await expect(
      boxService.createBox({ name: '   ', roomId: ROOM_ID, status: 'unpacked' }),
    ).rejects.toThrow('Box name is required.');
  });

  it('throws when status is invalid', async () => {
    await expect(
      boxService.createBox({ name: 'Box', roomId: ROOM_ID, status: 'invalid' as any }),
    ).rejects.toThrow('Invalid box status.');
  });

  it('throws when room is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(
      boxService.createBox({ name: 'Box', roomId: ROOM_ID, status: 'unpacked' }),
    ).rejects.toThrow('Room not found.');
  });

  it('creates box and returns id', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-box-1' }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeRoom, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(insertChain);

    const result = await boxService.createBox({ name: 'Box', roomId: ROOM_ID, status: 'unpacked' });
    expect(result).toBe('new-box-1');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Box', room_id: ROOM_ID, user_id: USER_ID }),
    );
  });

  it('resolves unique name when sibling exists', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-box-2' }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeRoom, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [{ name: 'Box' }], error: null }))
      .mockReturnValueOnce(insertChain);

    await boxService.createBox({ name: 'Box', roomId: ROOM_ID, status: 'unpacked' });

    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.name).toBe('Box #2');
  });
});

describe('boxService.updateBox', () => {
  it('throws when boxId is empty', async () => {
    await expect(
      boxService.updateBox('   ', { name: 'Box', roomId: ROOM_ID, status: 'unpacked' }),
    ).rejects.toThrow('Box id is required.');
  });

  it('throws when name is empty', async () => {
    await expect(
      boxService.updateBox(BOX_ID, { name: '   ', roomId: ROOM_ID, status: 'unpacked' }),
    ).rejects.toThrow('Box name is required.');
  });

  it('throws when box is not found after update', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeRoom, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBox, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null })); // update returns no row

    await expect(
      boxService.updateBox(BOX_ID, { name: 'Box', roomId: ROOM_ID, status: 'unpacked' }),
    ).rejects.toThrow('Box not found.');
  });

  it('updates box successfully when changes detected', async () => {
    const updateChain = makeMockChain({ data: { id: BOX_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeRoom, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { ...fakeBox, name: 'Old Name' }, error: null }))
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(makeMockChain({ data: [fakeRoom], error: null })); // getRoomContextMap

    await expect(
      boxService.updateBox(BOX_ID, { name: 'New Name', roomId: ROOM_ID, status: 'unpacked' }),
    ).resolves.toBeUndefined();
  });
});

describe('boxService.deleteBox', () => {
  it('throws when boxId is empty', async () => {
    await expect(boxService.deleteBox('   ')).rejects.toThrow('Box id is required.');
  });

  it('throws when box is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(boxService.deleteBox(BOX_ID)).rejects.toThrow('Box not found.');
  });

  it('throws when box has items', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBox, error: null }))
      .mockReturnValueOnce(makeMockChain({ count: 3, error: null }));

    await expect(boxService.deleteBox(BOX_ID)).rejects.toThrow('Box has items. Empty it before deleting.');
  });

  it('deletes box successfully when empty', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBox, error: null }))
      .mockReturnValueOnce(makeMockChain({ count: 0, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [fakeRoom], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: BOX_ID }, error: null }));

    await expect(boxService.deleteBox(BOX_ID)).resolves.toBeUndefined();
  });
});

describe('boxService.markBoxDelivered', () => {
  it('throws when boxId is empty', async () => {
    await expect(boxService.markBoxDelivered('   ')).rejects.toThrow('Box id is required.');
  });

  it('throws when box is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(boxService.markBoxDelivered(BOX_ID)).rejects.toThrow('Box not found.');
  });

  it('marks box as delivered without destination', async () => {
    const updateChain = makeMockChain({ error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: BOX_ID, name: 'Box #1', room_id: ROOM_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [fakeRoom], error: null }))
      .mockReturnValueOnce(updateChain);

    await expect(boxService.markBoxDelivered(BOX_ID)).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'delivered' }));
  });
});

describe('boxService.markBoxUnpackedAtDestination', () => {
  it('throws when boxId is empty', async () => {
    await expect(boxService.markBoxUnpackedAtDestination('   ')).rejects.toThrow('Box id is required.');
  });

  it('throws when box is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(boxService.markBoxUnpackedAtDestination(BOX_ID)).rejects.toThrow('Box not found.');
  });

  it('marks box as unpacked at destination', async () => {
    const updateChain = makeMockChain({ error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: BOX_ID, name: 'Box #1', room_id: ROOM_ID }, error: null }))
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(makeMockChain({ data: [fakeRoom], error: null }));

    await expect(boxService.markBoxUnpackedAtDestination(BOX_ID)).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'unpacked_at_destination' });
  });
});
