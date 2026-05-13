jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock('@/lib/activity.service', () => ({
  activityService: {
    writeActivitySafely: jest.fn().mockResolvedValue(undefined),
  },
}));

import { supabase } from '@/lib/supabase';
import { itemService } from '@/lib/item.service';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;

function makeMockChain(result: Record<string, unknown> = { data: null, error: null }) {
  const self: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'ilike', 'not', 'is']) {
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
const ITEM_ID = 'item-1';
const ROOM_ID = 'room-1';
const LOCATION_ID = 'loc-1';

const fakeBoxContext = {
  id: BOX_ID,
  name: 'Box #1',
  room_id: ROOM_ID,
  fragility: 'normal',
  room: {
    id: ROOM_ID,
    name: 'Kitchen',
    location_id: LOCATION_ID,
    location: { id: LOCATION_ID, name: 'My Home' },
  },
};

const fakeItem = {
  id: ITEM_ID,
  name: 'Plates',
  notes: null,
  quantity: 4,
  is_fragile: false,
  photo_url: null,
  box_id: BOX_ID,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  mockStorageFrom.mockReturnValue({
    upload: jest.fn().mockResolvedValue({ error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/img.jpg' } }),
    remove: jest.fn().mockResolvedValue({ error: null }),
  });
});

describe('itemService.listItemsByBox', () => {
  it('throws when boxId is empty', async () => {
    await expect(itemService.listItemsByBox('   ')).rejects.toThrow('Box is required.');
  });

  it('throws when box is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(itemService.listItemsByBox(BOX_ID)).rejects.toThrow('Box not found.');
  });

  it('returns mapped items for the box', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [fakeItem], error: null }));

    const result = await itemService.listItemsByBox(BOX_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: ITEM_ID, name: 'Plates', quantity: 4, isFragile: false, boxId: BOX_ID });
  });

  it('returns empty array when box has no items', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }));

    const result = await itemService.listItemsByBox(BOX_ID);
    expect(result).toEqual([]);
  });
});

describe('itemService.createItem', () => {
  it('throws when name is empty', async () => {
    await expect(
      itemService.createItem({ name: '   ', quantity: 1, boxId: BOX_ID }),
    ).rejects.toThrow('Item name is required.');
  });

  it('throws when quantity is less than 1', async () => {
    await expect(
      itemService.createItem({ name: 'Plates', quantity: 0, boxId: BOX_ID }),
    ).rejects.toThrow('Quantity must be a whole number greater than 0.');
  });

  it('throws when quantity is not an integer', async () => {
    await expect(
      itemService.createItem({ name: 'Plates', quantity: 1.5, boxId: BOX_ID }),
    ).rejects.toThrow('Quantity must be a whole number greater than 0.');
  });

  it('throws when boxId is empty', async () => {
    await expect(
      itemService.createItem({ name: 'Plates', quantity: 1, boxId: '   ' }),
    ).rejects.toThrow('Box is required.');
  });

  it('throws when box is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(
      itemService.createItem({ name: 'Plates', quantity: 1, boxId: BOX_ID }),
    ).rejects.toThrow('Box not found.');
  });

  it('creates item and returns id', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-item-1' }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(insertChain);

    const result = await itemService.createItem({ name: 'Plates', quantity: 4, boxId: BOX_ID });
    expect(result).toBe('new-item-1');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Plates', quantity: 4, box_id: BOX_ID, user_id: USER_ID }),
    );
  });

  it('normalises blank notes to null', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-item-1' }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(insertChain);

    await itemService.createItem({ name: 'Plates', quantity: 1, boxId: BOX_ID, notes: '   ' });
    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.notes).toBeNull();
  });

  it('resolves unique name when sibling exists', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-item-2' }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [{ name: 'Plates' }], error: null }))
      .mockReturnValueOnce(insertChain);

    await itemService.createItem({ name: 'Plates', quantity: 1, boxId: BOX_ID });
    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.name).toBe('Plates #2');
  });
});

describe('itemService.updateItem', () => {
  it('throws when item is not found', async () => {
    mockFrom.mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(
      itemService.updateItem(ITEM_ID, { name: 'Cups', quantity: 2, boxId: BOX_ID }),
    ).rejects.toThrow('Item not found.');
  });

  it('updates item successfully', async () => {
    const updateChain = makeMockChain({ data: { id: ITEM_ID }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({
        data: { id: ITEM_ID, name: 'Plates', notes: null, quantity: 4, is_fragile: false, box_id: BOX_ID },
        error: null,
      }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(updateChain);

    await expect(
      itemService.updateItem(ITEM_ID, { name: 'Plates Updated', quantity: 6, boxId: BOX_ID }),
    ).resolves.toBeUndefined();

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Plates Updated', quantity: 6 }),
    );
  });
});

describe('itemService.deleteItem', () => {
  it('throws when itemId is empty', async () => {
    await expect(itemService.deleteItem('   ')).rejects.toThrow('Item id is required.');
  });

  it('throws when item is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(itemService.deleteItem(ITEM_ID)).rejects.toThrow('Item not found.');
  });

  it('deletes item successfully', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeItem, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }));

    await expect(itemService.deleteItem(ITEM_ID)).resolves.toBeUndefined();
  });

  it('throws when delete returns error', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeItem, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: new Error('delete failed') }));

    await expect(itemService.deleteItem(ITEM_ID)).rejects.toThrow('delete failed');
  });
});

describe('itemService – getCurrentUserId null user', () => {
  it('throws when getUser returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(itemService.listItemsByBox(BOX_ID)).rejects.toThrow('No authenticated user found.');
  });
});

describe('itemService.listItemsByBox – item normalisation', () => {
  it('falls back to "Unnamed item" for null name and quantity 1 for non-positive', async () => {
    const badItem = { id: 'i2', name: null, notes: null, quantity: 0, is_fragile: false, photo_url: null, box_id: BOX_ID, created_at: null, updated_at: null };

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [badItem], error: null }));

    const result = await itemService.listItemsByBox(BOX_ID);

    expect(result[0].name).toBe('Unnamed item');
    expect(result[0].quantity).toBe(1);
  });
});

describe('itemService.createItem – insert edge cases', () => {
  it('throws when insert returns no id', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [], error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(itemService.createItem({ name: 'Plates', quantity: 1, boxId: BOX_ID })).rejects.toThrow('Failed to create item.');
  });

  it('calls markBoxFragileIfNeeded when isFragile is true', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-item-1' }, error: null });
    const boxUpdateChain = makeMockChain({ error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { ...fakeBoxContext, fragility: 'normal' }, error: null })) // assertUserOwnsBox
      .mockReturnValueOnce(makeMockChain({ data: [], error: null })) // siblings
      .mockReturnValueOnce(insertChain) // insert
      .mockReturnValueOnce(boxUpdateChain); // markBoxFragileIfNeeded: update box fragility

    await expect(itemService.createItem({ name: 'Glass', quantity: 1, boxId: BOX_ID, isFragile: true })).resolves.toBe('new-item-1');
    // The box should be updated to fragile
    expect(boxUpdateChain.update).toHaveBeenCalledWith({ fragility: 'fragile' });
  });
});

describe('itemService.updateItem – box change', () => {
  it('logs Moved activity when box changes', async () => {
    const activityService = require('@/lib/activity.service').activityService;
    const updateChain = makeMockChain({ data: { id: ITEM_ID }, error: null });
    const oldBoxContext = {
      id: 'old-box',
      name: 'Old Box',
      room_id: ROOM_ID,
      fragility: null,
      room: { id: ROOM_ID, name: 'Kitchen', location_id: LOCATION_ID, location: { id: LOCATION_ID, name: 'My Home' } },
    };

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', notes: null, quantity: 4, is_fragile: false, box_id: 'old-box' }, error: null })) // itemBeforeUpdate
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null })) // assertUserOwnsBox (target)
      .mockReturnValueOnce(makeMockChain({ data: oldBoxContext, error: null })) // assertUserOwnsBox (previous)
      .mockReturnValueOnce(updateChain); // item update

    await expect(
      itemService.updateItem(ITEM_ID, { name: 'Plates', quantity: 4, boxId: BOX_ID }),
    ).resolves.toBeUndefined();

    expect(activityService.writeActivitySafely).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Moved' }),
    );
  });
});

describe('itemService.uploadItemPhoto', () => {
  it('uploads photo and updates photo_url', async () => {
    const updateChain = makeMockChain({ error: null });
    mockFrom.mockReturnValue(updateChain);

    // Minimal valid base64 (the string "test")
    await expect(itemService.uploadItemPhoto(ITEM_ID, 'dGVzdA==')).resolves.toBeUndefined();

    expect(mockStorageFrom).toHaveBeenCalledWith('item-images');
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ photo_url: 'https://example.com/img.jpg' }),
    );
  });

  it('throws when upload returns an error', async () => {
    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: new Error('upload failed') }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    });

    await expect(itemService.uploadItemPhoto(ITEM_ID, 'dGVzdA==')).rejects.toThrow('upload failed');
  });
});

describe('itemService.createItem – numbered sibling', () => {
  it('increments beyond the highest numbered sibling', async () => {
    const insertChain = makeMockChain({ data: { id: 'new-item-3' }, error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: [{ name: 'Plates' }, { name: 'Plates #2' }], error: null }))
      .mockReturnValueOnce(insertChain);

    await itemService.createItem({ name: 'Plates', quantity: 1, boxId: BOX_ID });
    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.name).toBe('Plates #3');
  });
});

describe('itemService.deleteItem – null fragility box', () => {
  it('deletes item successfully when box has null fragility', async () => {
    const nullFragilityBox = { ...fakeBoxContext, fragility: null };

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeItem, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: nullFragilityBox, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }));

    await expect(itemService.deleteItem(ITEM_ID)).resolves.toBeUndefined();
  });
});

describe('itemService.removeItemPhoto', () => {
  it('removes photo from storage and clears photo_url', async () => {
    const updateChain = makeMockChain({ error: null });
    mockFrom.mockReturnValue(updateChain);

    await expect(itemService.removeItemPhoto(ITEM_ID)).resolves.toBeUndefined();

    expect(mockStorageFrom).toHaveBeenCalledWith('item-images');
    expect(updateChain.update).toHaveBeenCalledWith({ photo_url: null });
  });

  it('throws when items update returns an error', async () => {
    const updateChain = makeMockChain({ error: new Error('update failed') });
    mockFrom.mockReturnValue(updateChain);

    await expect(itemService.removeItemPhoto(ITEM_ID)).rejects.toThrow('update failed');
  });
});

describe('itemService.updateItem – blank itemId', () => {
  it('throws when itemId is blank', async () => {
    await expect(
      itemService.updateItem('   ', { name: 'Plates', quantity: 1, boxId: BOX_ID }),
    ).rejects.toThrow('Item id is required.');
  });
});

describe('itemService.updateItem – update returns no data', () => {
  it('throws when update query returns no row', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Updated', notes: null, quantity: 4, is_fragile: false, box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(
      itemService.updateItem(ITEM_ID, { name: 'Updated', quantity: 4, boxId: BOX_ID }),
    ).rejects.toThrow('Item not found.');
  });
});

describe('itemService.updateItem – no changes branch', () => {
  it('returns early without logging activity when nothing changed and isFragile is false', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', notes: null, quantity: 4, is_fragile: false, box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }));

    await expect(
      itemService.updateItem(ITEM_ID, { name: 'Plates', quantity: 4, boxId: BOX_ID }),
    ).resolves.toBeUndefined();

    expect(activitySvc.writeActivitySafely).not.toHaveBeenCalled();
  });

  it('calls markBoxFragileIfNeeded when no changes but isFragile is true', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;
    const boxUpdateChain = makeMockChain({ error: null });

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', notes: null, quantity: 4, is_fragile: true, box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { ...fakeBoxContext, fragility: 'normal' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }))
      .mockReturnValueOnce(boxUpdateChain);

    await expect(
      itemService.updateItem(ITEM_ID, { name: 'Plates', quantity: 4, boxId: BOX_ID, isFragile: true }),
    ).resolves.toBeUndefined();

    expect(boxUpdateChain.update).toHaveBeenCalledWith({ fragility: 'fragile' });
    expect(activitySvc.writeActivitySafely).not.toHaveBeenCalled();
  });
});

describe('itemService.updateItem – isFragile with changes', () => {
  it('calls markBoxFragileIfNeeded when changes exist and isFragile is true', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', notes: null, quantity: 4, is_fragile: false, box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { ...fakeBoxContext, fragility: 'fragile' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }));

    await expect(
      itemService.updateItem(ITEM_ID, { name: 'Plates', quantity: 4, boxId: BOX_ID, isFragile: true }),
    ).resolves.toBeUndefined();

    expect(activitySvc.writeActivitySafely).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Updated' }),
    );
  });
});

describe('itemService.updateItem – change detail descriptions', () => {
  it('includes "marked as fragile" when fragility changes to true', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', notes: null, quantity: 4, is_fragile: false, box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { ...fakeBoxContext, fragility: 'fragile' }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }));

    await itemService.updateItem(ITEM_ID, { name: 'Plates', quantity: 4, boxId: BOX_ID, isFragile: true });

    const call = activitySvc.writeActivitySafely.mock.calls[0][0];
    expect(call.description).toContain('marked as fragile');
  });

  it('includes "notes cleared" when notes removed', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', notes: 'old notes', quantity: 4, is_fragile: false, box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }));

    await itemService.updateItem(ITEM_ID, { name: 'Plates', quantity: 4, boxId: BOX_ID, notes: null });

    const call = activitySvc.writeActivitySafely.mock.calls[0][0];
    expect(call.description).toContain('notes cleared');
  });

  it('includes "notes updated" when notes added', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', notes: null, quantity: 4, is_fragile: false, box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null }));

    await itemService.updateItem(ITEM_ID, { name: 'Plates', quantity: 4, boxId: BOX_ID, notes: 'new notes' });

    const call = activitySvc.writeActivitySafely.mock.calls[0][0];
    expect(call.description).toContain('notes updated');
  });
});

describe('itemService.searchItems', () => {
  it('returns empty array for blank query', async () => {
    const result = await itemService.searchItems('   ');
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns mapped search results with nested objects', async () => {
    const row = {
      id: ITEM_ID,
      name: 'Plates',
      quantity: 4,
      is_fragile: false,
      box_id: BOX_ID,
      boxes: { name: 'Box #1', rooms: { name: 'Kitchen', locations: { name: 'My Home' } } },
    };
    mockFrom.mockReturnValue(makeMockChain({ data: [row], error: null }));

    const result = await itemService.searchItems('Plates');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: ITEM_ID,
      name: 'Plates',
      boxName: 'Box #1',
      roomName: 'Kitchen',
      locationName: 'My Home',
    });
  });

  it('returns mapped results with array-wrapped nested relations', async () => {
    const row = {
      id: ITEM_ID,
      name: 'Cup',
      quantity: 1,
      is_fragile: null,
      box_id: BOX_ID,
      boxes: [{ name: 'Box #1', rooms: [{ name: 'Kitchen', locations: [{ name: 'My Home' }] }] }],
    };
    mockFrom.mockReturnValue(makeMockChain({ data: [row], error: null }));

    const result = await itemService.searchItems('Cup');

    expect(result[0].boxName).toBe('Box #1');
    expect(result[0].roomName).toBe('Kitchen');
    expect(result[0].locationName).toBe('My Home');
  });

  it('throws when query returns an error', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: new Error('search failed') }));

    await expect(itemService.searchItems('Plates')).rejects.toThrow('search failed');
  });
});

describe('itemService.markItemUnpacked', () => {
  it('throws when itemId is blank', async () => {
    await expect(itemService.markItemUnpacked('   ')).rejects.toThrow('Item id is required.');
  });

  it('throws when item is not found', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(itemService.markItemUnpacked(ITEM_ID)).rejects.toThrow('Item not found.');
  });

  it('marks item unpacked and logs activity when box_id is set', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', box_id: BOX_ID }, error: null }))
      .mockReturnValueOnce(makeMockChain({ error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }));

    await expect(itemService.markItemUnpacked(ITEM_ID)).resolves.toBeUndefined();

    expect(activitySvc.writeActivitySafely).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Updated', title: 'Item unpacked' }),
    );
  });

  it('marks item unpacked without activity when box_id is null', async () => {
    const activitySvc = require('@/lib/activity.service').activityService;

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID, name: 'Plates', box_id: null }, error: null }))
      .mockReturnValueOnce(makeMockChain({ error: null }));

    await expect(itemService.markItemUnpacked(ITEM_ID)).resolves.toBeUndefined();

    expect(activitySvc.writeActivitySafely).not.toHaveBeenCalled();
  });
});

describe('itemService.deleteItem – no data after delete', () => {
  it('throws when delete query returns no row', async () => {
    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeItem, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: fakeBoxContext, error: null }))
      .mockReturnValueOnce(makeMockChain({ data: null, error: null }));

    await expect(itemService.deleteItem(ITEM_ID)).rejects.toThrow('Item not found.');
  });
});

describe('itemService – box with null room in context (getNormalizedRoomLocation / getRoomNameByRoomId)', () => {
  it('handles box with null room and null room_id in activity context', async () => {
    const nullRoomBox = { id: BOX_ID, name: 'Box', room_id: null, fragility: null, room: null };

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeItem, error: null })) // itemBeforeDelete
      .mockReturnValueOnce(makeMockChain({ data: nullRoomBox, error: null })) // assertUserOwnsBox
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null })); // delete

    await expect(itemService.deleteItem(ITEM_ID)).resolves.toBeUndefined();
  });

  it('calls DB to resolve room name when box room join is null but room_id is set', async () => {
    const nullRoomJoinBox = { id: BOX_ID, name: 'Box', room_id: ROOM_ID, fragility: null, room: null };

    mockFrom
      .mockReturnValueOnce(makeMockChain({ data: fakeItem, error: null })) // itemBeforeDelete
      .mockReturnValueOnce(makeMockChain({ data: nullRoomJoinBox, error: null })) // assertUserOwnsBox
      .mockReturnValueOnce(makeMockChain({ data: { name: 'Kitchen' }, error: null })) // getRoomNameByRoomId
      .mockReturnValueOnce(makeMockChain({ data: { id: ITEM_ID }, error: null })); // delete

    await expect(itemService.deleteItem(ITEM_ID)).resolves.toBeUndefined();
  });
});
