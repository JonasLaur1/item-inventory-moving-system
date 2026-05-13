import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const mockUseColorScheme = jest.fn().mockReturnValue('light');
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: (...args: unknown[]) => mockUseColorScheme(...args),
}));

const mockSetActiveTheme = jest.fn();
jest.mock('@/constants/theme', () => ({
  setActiveTheme: (...args: unknown[]) => mockSetActiveTheme(...args),
  Colors: {},
  ColorPalettes: { light: {}, dark: {} },
}));

import { ThemePreferenceProvider, useThemePreference } from '@/hooks/use-theme-preference';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemePreferenceProvider>{children}</ThemePreferenceProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockUseColorScheme.mockReturnValue('light');
});

describe('ThemePreferenceProvider – initial load', () => {
  it('starts with isThemePreferenceLoaded false before load completes', () => {
    mockGetItem.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useThemePreference(), { wrapper });

    expect(result.current.isThemePreferenceLoaded).toBe(false);
    expect(result.current.themePreference).toBe('system');
  });

  it('defaults to system when no stored preference', async () => {
    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.themePreference).toBe('system');
  });

  it('restores stored light preference', async () => {
    mockGetItem.mockResolvedValue('light');

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.themePreference).toBe('light');
  });

  it('restores stored dark preference', async () => {
    mockGetItem.mockResolvedValue('dark');

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.themePreference).toBe('dark');
  });

  it('ignores invalid stored value and falls back to system', async () => {
    mockGetItem.mockResolvedValue('invalid-value');

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.themePreference).toBe('system');
  });

  it('still marks loaded when AsyncStorage throws', async () => {
    mockGetItem.mockRejectedValue(new Error('storage error'));

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.themePreference).toBe('system');
  });
});

describe('ThemePreferenceProvider – resolvedTheme', () => {
  it('resolves to light when system + system scheme is light', async () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.resolvedTheme).toBe('light');
  });

  it('resolves to dark when system + system scheme is dark', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('resolves to light when preference is light regardless of system', async () => {
    mockGetItem.mockResolvedValue('light');
    mockUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.resolvedTheme).toBe('light');
  });

  it('resolves to dark when preference is dark regardless of system', async () => {
    mockGetItem.mockResolvedValue('dark');
    mockUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('calls setActiveTheme when resolvedTheme changes', async () => {
    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    expect(mockSetActiveTheme).toHaveBeenCalledWith('light');
  });
});

describe('ThemePreferenceProvider – setThemePreference', () => {
  it('updates preference and persists to storage', async () => {
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    await act(async () => {
      await result.current.setThemePreference('dark');
    });

    expect(result.current.themePreference).toBe('dark');
    expect(mockSetItem).toHaveBeenCalledWith('@boxit/theme-preference', 'dark');
  });

  it('rolls back to previous preference and re-throws when storage fails', async () => {
    mockSetItem.mockRejectedValue(new Error('write failed'));

    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => expect(result.current.isThemePreferenceLoaded).toBe(true));

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.setThemePreference('dark');
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect((caughtError as Error | null)?.message).toBe('write failed');
    expect(result.current.themePreference).toBe('system');
  });
});

describe('ThemePreferenceProvider – unmount before load', () => {
  it('does not update state when unmounted before getItem resolves', async () => {
    let settle!: (val: string | null) => void;
    mockGetItem.mockReturnValue(new Promise<string | null>(res => { settle = res; }));

    const { unmount } = renderHook(() => useThemePreference(), { wrapper });
    unmount(); // sets isMounted = false

    settle('light'); // resolve AFTER unmount – isMounted is false
    await Promise.resolve();
    await Promise.resolve();
  });
});

describe('useThemePreference – outside provider', () => {
  it('throws when used outside ThemePreferenceProvider', () => {
    let thrown: Error | null = null;
    renderHook(() => {
      try {
        useThemePreference();
      } catch (e) {
        thrown = e as Error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown!.message).toBe('useThemePreference must be used within ThemePreferenceProvider');
  });
});
