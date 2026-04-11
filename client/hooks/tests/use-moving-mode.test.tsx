import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MovingModeProvider, useMovingMode } from '@/hooks/use-moving-mode';

const mockMultiGet = AsyncStorage.multiGet as jest.Mock;
const mockMultiSet = AsyncStorage.multiSet as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MovingModeProvider>{children}</MovingModeProvider>
);

const nullValues = [
  ['@boxit/moving-mode-active', null],
  ['@boxit/moving-mode-from', null],
  ['@boxit/moving-mode-to', null],
  ['@boxit/moving-mode-from-name', null],
  ['@boxit/moving-mode-to-name', null],
];

beforeEach(() => {
  jest.clearAllMocks();
  mockMultiGet.mockResolvedValue(nullValues);
  mockMultiSet.mockResolvedValue(undefined);
});

describe('MovingModeProvider – initial load (nothing stored)', () => {
  it('starts with isMovingActive false before load completes', () => {
    mockMultiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useMovingMode(), { wrapper });

    expect(result.current.isMovingActive).toBe(false);
    expect(result.current.isMovingModeLoaded).toBe(false);
  });

  it('marks loaded and all values null when nothing stored', async () => {
    const { result } = renderHook(() => useMovingMode(), { wrapper });

    await waitFor(() => expect(result.current.isMovingModeLoaded).toBe(true));

    expect(result.current.isMovingActive).toBe(false);
    expect(result.current.fromLocationId).toBeNull();
    expect(result.current.toLocationId).toBeNull();
    expect(result.current.fromLocationName).toBeNull();
    expect(result.current.toLocationName).toBeNull();
  });
});

describe('MovingModeProvider – initial load (values stored)', () => {
  it('restores moving mode from AsyncStorage', async () => {
    mockMultiGet.mockResolvedValue([
      ['@boxit/moving-mode-active', 'true'],
      ['@boxit/moving-mode-from', 'loc-1'],
      ['@boxit/moving-mode-to', 'loc-2'],
      ['@boxit/moving-mode-from-name', 'Home'],
      ['@boxit/moving-mode-to-name', 'Office'],
    ]);

    const { result } = renderHook(() => useMovingMode(), { wrapper });

    await waitFor(() => expect(result.current.isMovingModeLoaded).toBe(true));

    expect(result.current.isMovingActive).toBe(true);
    expect(result.current.fromLocationId).toBe('loc-1');
    expect(result.current.toLocationId).toBe('loc-2');
    expect(result.current.fromLocationName).toBe('Home');
    expect(result.current.toLocationName).toBe('Office');
  });

  it('still marks loaded true when AsyncStorage throws', async () => {
    mockMultiGet.mockRejectedValue(new Error('storage unavailable'));

    const { result } = renderHook(() => useMovingMode(), { wrapper });

    await waitFor(() => expect(result.current.isMovingModeLoaded).toBe(true));

    expect(result.current.isMovingActive).toBe(false);
  });
});

describe('MovingModeProvider – startMoving', () => {
  it('sets all moving state and persists to storage', async () => {
    const { result } = renderHook(() => useMovingMode(), { wrapper });
    await waitFor(() => expect(result.current.isMovingModeLoaded).toBe(true));

    await act(async () => {
      await result.current.startMoving('loc-1', 'Home', 'loc-2', 'Office');
    });

    expect(result.current.isMovingActive).toBe(true);
    expect(result.current.fromLocationId).toBe('loc-1');
    expect(result.current.toLocationId).toBe('loc-2');
    expect(result.current.fromLocationName).toBe('Home');
    expect(result.current.toLocationName).toBe('Office');
    expect(mockMultiSet).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['@boxit/moving-mode-active', 'true'],
        ['@boxit/moving-mode-from', 'loc-1'],
        ['@boxit/moving-mode-to', 'loc-2'],
        ['@boxit/moving-mode-from-name', 'Home'],
        ['@boxit/moving-mode-to-name', 'Office'],
      ]),
    );
  });

  it('rolls back all state and re-throws when storage fails', async () => {
    mockMultiSet.mockRejectedValue(new Error('write failed'));

    const { result } = renderHook(() => useMovingMode(), { wrapper });
    await waitFor(() => expect(result.current.isMovingModeLoaded).toBe(true));

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.startMoving('loc-1', 'Home', 'loc-2', 'Office');
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect((caughtError as Error | null)?.message).toBe('write failed');
    expect(result.current.isMovingActive).toBe(false);
    expect(result.current.fromLocationId).toBeNull();
    expect(result.current.toLocationId).toBeNull();
    expect(result.current.fromLocationName).toBeNull();
    expect(result.current.toLocationName).toBeNull();
  });
});

describe('MovingModeProvider – stopMoving', () => {
  it('clears all moving state and persists to storage', async () => {
    mockMultiGet.mockResolvedValue([
      ['@boxit/moving-mode-active', 'true'],
      ['@boxit/moving-mode-from', 'loc-1'],
      ['@boxit/moving-mode-to', 'loc-2'],
      ['@boxit/moving-mode-from-name', 'Home'],
      ['@boxit/moving-mode-to-name', 'Office'],
    ]);

    const { result } = renderHook(() => useMovingMode(), { wrapper });
    await waitFor(() => expect(result.current.isMovingModeLoaded).toBe(true));

    await act(async () => {
      await result.current.stopMoving();
    });

    expect(result.current.isMovingActive).toBe(false);
    expect(result.current.fromLocationId).toBeNull();
    expect(result.current.toLocationId).toBeNull();
    expect(result.current.fromLocationName).toBeNull();
    expect(result.current.toLocationName).toBeNull();
  });

  it('rolls back isMovingActive and re-throws when storage fails', async () => {
    mockMultiGet.mockResolvedValue([
      ['@boxit/moving-mode-active', 'true'],
      ['@boxit/moving-mode-from', 'loc-1'],
      ['@boxit/moving-mode-to', 'loc-2'],
      ['@boxit/moving-mode-from-name', 'Home'],
      ['@boxit/moving-mode-to-name', 'Office'],
    ]);
    mockMultiSet.mockRejectedValue(new Error('write failed'));

    const { result } = renderHook(() => useMovingMode(), { wrapper });
    await waitFor(() => expect(result.current.isMovingModeLoaded).toBe(true));

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.stopMoving();
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect((caughtError as Error | null)?.message).toBe('write failed');
    expect(result.current.isMovingActive).toBe(true);
  });
});

describe('MovingModeProvider – unmount before load', () => {
  it('does not update state when unmounted before multiGet resolves', async () => {
    let settle!: (val: typeof nullValues) => void;
    mockMultiGet.mockReturnValue(new Promise<typeof nullValues>(res => { settle = res; }));

    const { unmount } = renderHook(() => useMovingMode(), { wrapper });
    unmount(); // sets isMounted = false

    settle(nullValues); // resolve AFTER unmount – isMounted is false
    await Promise.resolve();
    await Promise.resolve();
  });
});

describe('useMovingMode – outside provider', () => {
  it('throws when used outside MovingModeProvider', () => {
    let thrown: Error | null = null;
    renderHook(() => {
      try {
        useMovingMode();
      } catch (e) {
        thrown = e as Error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown!.message).toBe('useMovingMode must be used within MovingModeProvider');
  });
});
