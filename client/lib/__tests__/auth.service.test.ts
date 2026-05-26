jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      setSession: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth.service';

const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockResetPasswordForEmail = supabase.auth.resetPasswordForEmail as jest.Mock;
const mockSetSession = supabase.auth.setSession as jest.Mock;
const mockUpdateUser = supabase.auth.updateUser as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService.signUp', () => {
  it('returns data on success', async () => {
    const fakeData = { user: { id: 'u1' }, session: null };
    mockSignUp.mockResolvedValue({ data: fakeData, error: null });

    const result = await authService.signUp('alice', 'alice@example.com', 'pass123');
    expect(result).toBe(fakeData);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'pass123',
      options: { data: { username: 'alice' } },
    });
  });

  it('throws when supabase returns an error', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: new Error('email taken') });

    await expect(authService.signUp('alice', 'alice@example.com', 'pass')).rejects.toThrow('email taken');
  });
});

describe('authService.signIn', () => {
  it('returns data on success', async () => {
    const fakeData = { user: { id: 'u1' }, session: { access_token: 'tok' } };
    mockSignIn.mockResolvedValue({ data: fakeData, error: null });

    const result = await authService.signIn('alice@example.com', 'pass123');
    expect(result).toBe(fakeData);
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'pass123' });
  });

  it('throws when credentials are invalid', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: new Error('invalid credentials') });

    await expect(authService.signIn('bad@example.com', 'wrong')).rejects.toThrow('invalid credentials');
  });
});

describe('authService.getSession', () => {
  it('returns the session', async () => {
    const fakeSession = { access_token: 'tok', user: { id: 'u1' } };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession }, error: null });

    const result = await authService.getSession();
    expect(result).toBe(fakeSession);
  });

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    expect(await authService.getSession()).toBeNull();
  });

  it('throws on error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: new Error('session error') });

    await expect(authService.getSession()).rejects.toThrow('session error');
  });
});

describe('authService.signOut', () => {
  it('resolves without error on success', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await expect(authService.signOut()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('throws on error', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('sign out failed') });

    await expect(authService.signOut()).rejects.toThrow('sign out failed');
  });
});

describe('authService.remindPassword', () => {
  it('calls resetPasswordForEmail with email and redirectTo', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    await expect(
      authService.remindPassword('alice@example.com', 'https://app.example.com/reset'),
    ).resolves.toBeUndefined();

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('alice@example.com', {
      redirectTo: 'https://app.example.com/reset',
    });
  });

  it('throws on error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: new Error('rate limited') });

    await expect(authService.remindPassword('a@b.com', 'https://x.com')).rejects.toThrow('rate limited');
  });
});

describe('authService.setRecoverySession', () => {
  it('calls setSession with provided tokens', async () => {
    mockSetSession.mockResolvedValue({ error: null });

    await expect(authService.setRecoverySession('access123', 'refresh456')).resolves.toBeUndefined();

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access123',
      refresh_token: 'refresh456',
    });
  });

  it('throws on error', async () => {
    mockSetSession.mockResolvedValue({ error: new Error('invalid token') });

    await expect(authService.setRecoverySession('bad', 'token')).rejects.toThrow('invalid token');
  });
});

describe('authService.updatePassword', () => {
  it('calls updateUser with new password', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });

    await expect(authService.updatePassword('newpass123')).resolves.toBeUndefined();
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' });
  });

  it('throws on error', async () => {
    mockUpdateUser.mockResolvedValue({ error: new Error('weak password') });

    await expect(authService.updatePassword('123')).rejects.toThrow('weak password');
  });
});

describe('authService.onAuthStateChange', () => {
  it('calls supabase.auth.onAuthStateChange and returns subscription', () => {
    const fakeSubscription = { unsubscribe: jest.fn() };
    mockOnAuthStateChange.mockReturnValue(fakeSubscription);

    const callback = jest.fn();
    const result = authService.onAuthStateChange(callback);

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(result).toBe(fakeSubscription);
  });

  it('invokes the callback when the auth state change fires', () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      cb('SIGNED_IN', { access_token: 'tok' });
      return { unsubscribe: jest.fn() };
    });

    const callback = jest.fn();
    authService.onAuthStateChange(callback);

    expect(callback).toHaveBeenCalledWith('SIGNED_IN', { access_token: 'tok' });
  });
});
