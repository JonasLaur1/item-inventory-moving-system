jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

jest.mock('@/lib/activity.service', () => ({
  activityService: {
    writeActivitySafely: jest.fn().mockResolvedValue(undefined),
  },
}));

import { supabase } from '@/lib/supabase';
import { collaboratorService } from '@/lib/collaborator.service';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;
const mockFunctionsInvoke = supabase.functions.invoke as jest.Mock;

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

const USER_ID = 'user-owner';
const LOCATION_ID = 'loc-1';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
});

describe('collaboratorService.listCollaborators', () => {
  it('returns empty array when no collaborators exist', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: [], error: null }));

    const result = await collaboratorService.listCollaborators(LOCATION_ID);
    expect(result).toEqual([]);
  });

  it('returns mapped collaborator entries', async () => {
    const row = {
      id: 'collab-row-1',
      collaborator_id: 'user-collab',
      created_at: '2024-01-01T00:00:00Z',
      profiles: [{ display_name: 'Bob' }],
    };
    mockFrom.mockReturnValue(makeMockChain({ data: [row], error: null }));

    const result = await collaboratorService.listCollaborators(LOCATION_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'collab-row-1',
      collaboratorId: 'user-collab',
      displayName: 'Bob',
      addedAt: '2024-01-01T00:00:00Z',
    });
  });

  it('sets displayName to null when profiles array is empty', async () => {
    const row = {
      id: 'collab-row-1',
      collaborator_id: 'user-collab',
      created_at: '2024-01-01T00:00:00Z',
      profiles: [],
    };
    mockFrom.mockReturnValue(makeMockChain({ data: [row], error: null }));

    const result = await collaboratorService.listCollaborators(LOCATION_ID);
    expect(result[0].displayName).toBeNull();
  });

  it('throws when query returns an error', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: new Error('query failed') }));

    await expect(collaboratorService.listCollaborators(LOCATION_ID)).rejects.toThrow('query failed');
  });
});

describe('collaboratorService.addCollaboratorByEmail', () => {
  it('throws for missing email', async () => {
    await expect(collaboratorService.addCollaboratorByEmail(LOCATION_ID, '')).rejects.toThrow(
      'A valid email is required.',
    );
  });

  it('throws for email without @', async () => {
    await expect(
      collaboratorService.addCollaboratorByEmail(LOCATION_ID, 'notanemail'),
    ).rejects.toThrow('A valid email is required.');
  });

  it('throws when location not owned by user', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(
      collaboratorService.addCollaboratorByEmail(LOCATION_ID, 'bob@example.com'),
    ).rejects.toThrow('Location not found or you do not own it.');
  });

  it('throws when lookup edge function returns an error', async () => {
    mockFrom.mockReturnValue(
      makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }),
    );
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: new Error('function error') });

    await expect(
      collaboratorService.addCollaboratorByEmail(LOCATION_ID, 'bob@example.com'),
    ).rejects.toThrow('Failed to look up user. Please try again later.');
  });

  it('throws when no BoxIt account is found for email', async () => {
    mockFrom.mockReturnValue(
      makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null }),
    );
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: null });

    await expect(
      collaboratorService.addCollaboratorByEmail(LOCATION_ID, 'bob@example.com'),
    ).rejects.toThrow('No BoxIt account found for that email.');
  });

  it('adds collaborator successfully', async () => {
    const locationChain = makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null });
    const insertChain = makeMockChain({ error: null });

    mockFrom
      .mockReturnValueOnce(locationChain)
      .mockReturnValueOnce(insertChain);

    mockFunctionsInvoke.mockResolvedValue({
      data: { id: 'user-bob', displayName: 'Bob' },
      error: null,
    });

    await expect(
      collaboratorService.addCollaboratorByEmail(LOCATION_ID, 'bob@example.com'),
    ).resolves.toBeUndefined();

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        location_id: LOCATION_ID,
        owner_id: USER_ID,
        collaborator_id: 'user-bob',
      }),
    );
  });

  it('throws "already a collaborator" on unique constraint violation', async () => {
    const locationChain = makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null });
    const insertChain = makeMockChain({ error: { code: '23505', message: 'unique violation' } });

    mockFrom
      .mockReturnValueOnce(locationChain)
      .mockReturnValueOnce(insertChain);

    mockFunctionsInvoke.mockResolvedValue({
      data: { id: 'user-bob', displayName: 'Bob' },
      error: null,
    });

    await expect(
      collaboratorService.addCollaboratorByEmail(LOCATION_ID, 'bob@example.com'),
    ).rejects.toThrow('This person is already a collaborator on this location.');
  });
});

describe('collaboratorService.removeCollaborator', () => {
  it('throws when location not owned by user', async () => {
    mockFrom.mockReturnValue(makeMockChain({ data: null, error: null }));

    await expect(
      collaboratorService.removeCollaborator(LOCATION_ID, 'user-bob'),
    ).rejects.toThrow('Location not found or you do not own it.');
  });

  it('throws when collaborator row not found', async () => {
    const locationChain = makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null });
    const deleteChain = makeMockChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(locationChain)
      .mockReturnValueOnce(deleteChain);

    await expect(
      collaboratorService.removeCollaborator(LOCATION_ID, 'user-bob'),
    ).rejects.toThrow('Collaborator not found.');
  });

  it('removes collaborator successfully', async () => {
    const locationChain = makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null });
    const deleteChain = makeMockChain({ data: { id: 'collab-row-1' }, error: null });

    mockFrom
      .mockReturnValueOnce(locationChain)
      .mockReturnValueOnce(deleteChain);

    await expect(
      collaboratorService.removeCollaborator(LOCATION_ID, 'user-bob'),
    ).resolves.toBeUndefined();
  });

  it('throws when delete returns an error', async () => {
    const locationChain = makeMockChain({ data: { id: LOCATION_ID, name: 'My Home' }, error: null });
    const deleteChain = makeMockChain({ data: null, error: new Error('delete failed') });

    mockFrom
      .mockReturnValueOnce(locationChain)
      .mockReturnValueOnce(deleteChain);

    await expect(
      collaboratorService.removeCollaborator(LOCATION_ID, 'user-bob'),
    ).rejects.toThrow('delete failed');
  });
});
