import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { UserProfile } from '@/lib/profile.service';
import { useProfile } from '@/hooks/use-profile';

const mockGetProfile = jest.fn();
const mockUpdateDisplayName = jest.fn();

jest.mock('@/lib/profile.service', () => ({
  profileService: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    updateDisplayName: (...args: unknown[]) => mockUpdateDisplayName(...args),
  },
}));

const fakeProfile: UserProfile = {
  id: 'user-1',
  displayName: 'Alice',
  email: 'alice@example.com',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useProfile – initial state', () => {
  it('starts with isLoading true and profile null', () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profile).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.saveErrorMessage).toBeNull();
  });
});

describe('useProfile – loading', () => {
  it('loads profile on mount', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.profile).toEqual(fakeProfile);
    expect(result.current.errorMessage).toBeNull();
  });

  it('sets errorMessage when load fails', async () => {
    mockGetProfile.mockRejectedValue(new Error('Auth error'));
    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Auth error');
    expect(result.current.profile).toBeNull();
  });

  it('uses fallback message for non-Error rejections', async () => {
    mockGetProfile.mockRejectedValue('oops');
    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Failed to load profile');
  });
});

describe('useProfile – updateDisplayName', () => {
  it('sets isSaving true during update, then false', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveUpdate!: () => void;
    mockUpdateDisplayName.mockReturnValue(new Promise<void>(r => { resolveUpdate = r; }));

    let savePromise!: Promise<boolean>;
    act(() => {
      savePromise = result.current.updateDisplayName('Bob');
    });

    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      resolveUpdate();
      await savePromise;
    });

    expect(result.current.isSaving).toBe(false);
  });

  it('calls service and returns true on success', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateDisplayName.mockResolvedValue(undefined);

    let success!: boolean;
    await act(async () => {
      success = await result.current.updateDisplayName('Bob');
    });

    expect(mockUpdateDisplayName).toHaveBeenCalledWith('Bob');
    expect(success).toBe(true);
  });

  it('optimistically updates profile.displayName on success', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateDisplayName.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.updateDisplayName('  Bob  ');
    });

    expect(result.current.profile?.displayName).toBe('Bob');
  });

  it('sets saveErrorMessage and returns false on failure', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateDisplayName.mockRejectedValue(new Error('Save failed'));

    let success!: boolean;
    await act(async () => {
      success = await result.current.updateDisplayName('Bob');
    });

    expect(success).toBe(false);
    expect(result.current.saveErrorMessage).toBe('Save failed');
    expect(result.current.isSaving).toBe(false);
  });

  it('is a no-op and returns false when already saving', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveFirst!: () => void;
    mockUpdateDisplayName.mockReturnValue(new Promise<void>(r => { resolveFirst = r; }));

    let firstPromise!: Promise<boolean>;
    act(() => {
      firstPromise = result.current.updateDisplayName('Bob');
    });

    // isSaving is now true; second call should be a no-op
    let secondResult!: boolean;
    await act(async () => {
      secondResult = await result.current.updateDisplayName('Charlie');
    });

    expect(secondResult).toBe(false);
    expect(mockUpdateDisplayName).toHaveBeenCalledTimes(1);

    // Resolve the first call
    await act(async () => {
      resolveFirst();
      await firstPromise;
    });
  });
});

describe('useProfile – clearSaveError', () => {
  it('resets saveErrorMessage to null', async () => {
    mockGetProfile.mockResolvedValue(fakeProfile);
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockUpdateDisplayName.mockRejectedValue(new Error('Save failed'));
    await act(async () => {
      await result.current.updateDisplayName('Bob');
    });
    expect(result.current.saveErrorMessage).toBe('Save failed');

    act(() => {
      result.current.clearSaveError();
    });

    expect(result.current.saveErrorMessage).toBeNull();
  });
});
