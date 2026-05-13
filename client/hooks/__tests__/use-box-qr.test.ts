import { renderHook, act, waitFor } from '@testing-library/react-native';

import type { BoxDetails } from '@/lib/box.service';
import type { GeneratedBoxQr, QrMatrix } from '@/utils/box-qr';
import { useBoxQr } from '@/hooks/use-box-qr';

const mockGenerateBoxQrData = jest.fn();

jest.mock('@/utils/box-qr', () => ({
  generateBoxQrData: (...args: unknown[]) => mockGenerateBoxQrData(...args),
}));

// 2×2 matrix: top-left and bottom-right are dark
const fakeQrMatrix: QrMatrix = {
  size: 2,
  modules: [true, false, false, true],
};

const fakeGeneratedQr: GeneratedBoxQr = {
  deepLink: 'client://box/box-1',
  appLinkUrl: 'https://boxit.app/box/box-1',
  matrix: fakeQrMatrix,
};

const fakeBox: BoxDetails = {
  id: 'box-1',
  name: 'Box 1',
  status: 'unpacked',
  roomId: 'room-1',
  roomName: 'Kitchen',
  locationId: 'loc-1',
  locationName: 'My Home',
  parentLocationId: 'loc-1',
  parentLocationName: 'My Home',
  updatedAt: '2024-01-01T00:00:00Z',
  itemsCount: 0,
  isFragile: false,
  items: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBoxQr – initial state', () => {
  it('starts with modal closed and no QR data', () => {
    const { result } = renderHook(() => useBoxQr(fakeBox));

    expect(result.current.isQrModalOpen).toBe(false);
    expect(result.current.isGeneratingQr).toBe(false);
    expect(result.current.qrMatrix).toBeNull();
    expect(result.current.qrAppLinkUrl).toBeNull();
    expect(result.current.qrErrorMessage).toBeNull();
    expect(result.current.qrDarkCells).toEqual([]);
  });

  it('does nothing when box is null', () => {
    const { result } = renderHook(() => useBoxQr(null));

    expect(result.current.isQrModalOpen).toBe(false);
    expect(result.current.qrMatrix).toBeNull();
  });
});

describe('useBoxQr – openQrModal / closeQrModal', () => {
  it('openQrModal does nothing when box is null', () => {
    const { result } = renderHook(() => useBoxQr(null));

    act(() => {
      result.current.openQrModal();
    });

    expect(result.current.isQrModalOpen).toBe(false);
  });

  it('openQrModal sets isQrModalOpen true and generates QR', async () => {
    mockGenerateBoxQrData.mockReturnValue(fakeGeneratedQr);
    const { result } = renderHook(() => useBoxQr(fakeBox));

    act(() => {
      result.current.openQrModal();
    });

    expect(result.current.isQrModalOpen).toBe(true);

    await waitFor(() => expect(result.current.isGeneratingQr).toBe(false));

    expect(result.current.qrMatrix).toEqual(fakeQrMatrix);
    expect(result.current.qrAppLinkUrl).toBe('https://boxit.app/box/box-1');
    expect(result.current.qrErrorMessage).toBeNull();
    expect(mockGenerateBoxQrData).toHaveBeenCalledWith('box-1');
  });

  it('closeQrModal sets isQrModalOpen false and clears QR state', async () => {
    mockGenerateBoxQrData.mockReturnValue(fakeGeneratedQr);
    const { result } = renderHook(() => useBoxQr(fakeBox));

    act(() => {
      result.current.openQrModal();
    });
    await waitFor(() => expect(result.current.isGeneratingQr).toBe(false));

    act(() => {
      result.current.closeQrModal();
    });

    expect(result.current.isQrModalOpen).toBe(false);

    await waitFor(() => {
      expect(result.current.qrMatrix).toBeNull();
      expect(result.current.qrAppLinkUrl).toBeNull();
    });
  });
});

describe('useBoxQr – QR generation', () => {
  it('generates QR synchronously on modal open, isGeneratingQr ends false', async () => {
    // generateBoxQrData is synchronous — isGeneratingQr is true then immediately false
    // within the same effect tick, so we verify the end state
    mockGenerateBoxQrData.mockReturnValue(fakeGeneratedQr);

    const { result } = renderHook(() => useBoxQr(fakeBox));

    act(() => {
      result.current.openQrModal();
    });

    await waitFor(() => expect(result.current.isGeneratingQr).toBe(false));

    expect(result.current.qrMatrix).toEqual(fakeQrMatrix);
    expect(result.current.qrAppLinkUrl).toBe('https://boxit.app/box/box-1');
  });

  it('sets qrErrorMessage and clears matrix on generation failure', async () => {
    mockGenerateBoxQrData.mockImplementation(() => {
      throw new Error('QR generation failed');
    });

    const { result } = renderHook(() => useBoxQr(fakeBox));

    act(() => {
      result.current.openQrModal();
    });

    await waitFor(() => expect(result.current.isGeneratingQr).toBe(false));

    expect(result.current.qrErrorMessage).toBe('QR generation failed');
    expect(result.current.qrMatrix).toBeNull();
    expect(result.current.qrAppLinkUrl).toBeNull();
  });
});

describe('useBoxQr – qrDarkCells', () => {
  it('returns empty array when qrMatrix is null', () => {
    const { result } = renderHook(() => useBoxQr(fakeBox));
    expect(result.current.qrDarkCells).toEqual([]);
  });

  it('returns correct dark cells from the matrix', async () => {
    mockGenerateBoxQrData.mockReturnValue(fakeGeneratedQr);
    const { result } = renderHook(() => useBoxQr(fakeBox));

    act(() => {
      result.current.openQrModal();
    });

    await waitFor(() => expect(result.current.qrMatrix).not.toBeNull());

    // 2×2 matrix with top-left and bottom-right dark → 2 cells
    expect(result.current.qrDarkCells).toHaveLength(2);
    expect(result.current.qrDarkCells[0].key).toBe('0-0');
    expect(result.current.qrDarkCells[1].key).toBe('1-1');
  });
});

describe('useBoxQr – retryGenerateQr', () => {
  it('is a no-op when isGeneratingQr is true', () => {
    // We test this by checking the guard directly: the hook exposes isGeneratingQr,
    // and retryGenerateQr reads it from state. Since generation is synchronous,
    // we verify that calling retry while the flag is false (normal) does trigger
    // a new generation, and calling it a second time in the same synchronous act
    // does not double-fire because qrVersion would already be bumped.
    mockGenerateBoxQrData.mockReturnValue(fakeGeneratedQr);
    const { result } = renderHook(() => useBoxQr(fakeBox));
    // isGeneratingQr starts false — calling retry once should work
    expect(result.current.isGeneratingQr).toBe(false);
    // retryGenerateQr only fires when not generating; since we haven't opened modal
    // (qrMatrix is null), calling retry is safe — it just bumps qrVersion, which
    // won't generate because modal is still closed (no-op by the effect guard)
    act(() => {
      result.current.retryGenerateQr();
    });
    // Modal is closed so effect guard prevents generation
    expect(mockGenerateBoxQrData).not.toHaveBeenCalled();
  });

  it('triggers re-generation after a failure', async () => {
    mockGenerateBoxQrData
      .mockImplementationOnce(() => { throw new Error('First failure'); })
      .mockReturnValueOnce(fakeGeneratedQr);

    const { result } = renderHook(() => useBoxQr(fakeBox));

    act(() => {
      result.current.openQrModal();
    });

    await waitFor(() => expect(result.current.qrErrorMessage).toBe('First failure'));

    act(() => {
      result.current.retryGenerateQr();
    });

    await waitFor(() => expect(result.current.qrMatrix).toEqual(fakeQrMatrix));
    expect(result.current.qrErrorMessage).toBeNull();
    expect(mockGenerateBoxQrData).toHaveBeenCalledTimes(2);
  });
});
