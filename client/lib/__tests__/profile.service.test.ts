jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
import { profileService } from '@/lib/profile.service';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

function makeMockChain(result: Record<string, unknown> = { data: null, error: null }) {
  const self: any = {};
  for (const m of ['select', 'update', 'upsert', 'eq']) {
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
  mockGetUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: 'alice@example.com' } },
    error: null,
  });
});

describe('profileService.getProfile', () => {
  it('returns profile with display name when profile row exists', async () => {
    const chain = makeMockChain({ data: { id: USER_ID, display_name: 'Alice' }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await profileService.getProfile();

    expect(result).toEqual({ id: USER_ID, displayName: 'Alice', email: 'alice@example.com' });
  });

  it('returns null displayName when profile row is missing (PGRST116)', async () => {
    const chain = makeMockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    mockFrom.mockReturnValue(chain);

    const result = await profileService.getProfile();

    expect(result.displayName).toBeNull();
    expect(result.id).toBe(USER_ID);
  });

  it('returns null displayName when profile has no display_name', async () => {
    const chain = makeMockChain({ data: { id: USER_ID, display_name: null }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await profileService.getProfile();
    expect(result.displayName).toBeNull();
  });

  it('throws when getUser returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not authed') });

    await expect(profileService.getProfile()).rejects.toThrow('not authed');
  });

  it('throws when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(profileService.getProfile()).rejects.toThrow('Not authenticated');
  });

  it('throws when profile query returns a non-PGRST116 error', async () => {
    const chain = makeMockChain({ data: null, error: { code: 'OTHER', message: 'db error' } });
    mockFrom.mockReturnValue(chain);

    await expect(profileService.getProfile()).rejects.toMatchObject({ code: 'OTHER' });
  });
});

describe('profileService.updateDisplayName', () => {
  it('calls upsert with trimmed display name', async () => {
    const chain = makeMockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await expect(profileService.updateDisplayName('  Alice  ')).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER_ID, display_name: 'Alice' }),
    );
  });

  it('throws when upsert returns an error', async () => {
    const chain = makeMockChain({ error: new Error('upsert failed') });
    mockFrom.mockReturnValue(chain);

    await expect(profileService.updateDisplayName('Alice')).rejects.toThrow('upsert failed');
  });

  it('throws when getUser returns error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') });

    await expect(profileService.updateDisplayName('Alice')).rejects.toThrow('no session');
  });

  it('throws Not authenticated when getUser returns no user id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(profileService.updateDisplayName('Alice')).rejects.toThrow('Not authenticated');
  });
});

describe('profileService.getProfile – null email', () => {
  it('returns null email when user has no email field', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const chain = makeMockChain({ data: { id: USER_ID, display_name: 'Alice' }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await profileService.getProfile();
    expect(result.email).toBeNull();
  });
});
