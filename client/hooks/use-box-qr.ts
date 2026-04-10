import { type BoxDetails } from "@/lib/box.service";
import { generateBoxQrData, type QrMatrix } from "@/utils/box-qr";
import { useCallback, useEffect, useMemo, useState } from "react";

const QR_DISPLAY_SIZE = 196;
const QR_QUIET_ZONE_MODULES = 4;

type QrDarkCell = { x: number; y: number; size: number; key: string };

type UseBoxQrResult = {
  isQrModalOpen: boolean;
  isGeneratingQr: boolean;
  qrMatrix: QrMatrix | null;
  qrDarkCells: QrDarkCell[];
  qrErrorMessage: string | null;
  qrAppLinkUrl: string | null;
  openQrModal: () => void;
  closeQrModal: () => void;
  retryGenerateQr: () => void;
};

export function useBoxQr(box: BoxDetails | null): UseBoxQrResult {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrMatrix, setQrMatrix] = useState<QrMatrix | null>(null);
  const [qrAppLinkUrl, setQrAppLinkUrl] = useState<string | null>(null);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);
  const [qrVersion, setQrVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    if (!box || !isQrModalOpen) {
      setQrAppLinkUrl(null);
      setQrMatrix(null);
      setQrErrorMessage(null);
      setIsGeneratingQr(false);
      return () => {
        isActive = false;
      };
    }

    setIsGeneratingQr(true);
    setQrErrorMessage(null);

    void (async () => {
      try {
        const generatedQr = generateBoxQrData(box.id);

        if (!isActive) {
          return;
        }

        setQrAppLinkUrl(generatedQr.appLinkUrl);
        setQrMatrix(generatedQr.matrix);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to generate QR code.";
        setQrAppLinkUrl(null);
        setQrMatrix(null);
        setQrErrorMessage(message);
      } finally {
        if (isActive) {
          setIsGeneratingQr(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [box, isQrModalOpen, qrVersion]);

  const qrDarkCells = useMemo((): QrDarkCell[] => {
    if (!qrMatrix) {
      return [];
    }

    const modulesPerSide = qrMatrix.size + QR_QUIET_ZONE_MODULES * 2;
    const cellSize = QR_DISPLAY_SIZE / modulesPerSide;
    const cells: QrDarkCell[] = [];

    for (let row = 0; row < qrMatrix.size; row += 1) {
      for (let column = 0; column < qrMatrix.size; column += 1) {
        const index = row * qrMatrix.size + column;
        if (!qrMatrix.modules[index]) {
          continue;
        }

        const x = (column + QR_QUIET_ZONE_MODULES) * cellSize;
        const y = (row + QR_QUIET_ZONE_MODULES) * cellSize;
        cells.push({ x, y, size: cellSize, key: `${row}-${column}` });
      }
    }

    return cells;
  }, [qrMatrix]);

  const openQrModal = useCallback(() => {
    if (!box) {
      return;
    }

    setIsQrModalOpen(true);
  }, [box]);

  const closeQrModal = useCallback(() => {
    setIsQrModalOpen(false);
  }, []);

  const retryGenerateQr = useCallback(() => {
    if (isGeneratingQr) {
      return;
    }

    setQrVersion((prev) => prev + 1);
  }, [isGeneratingQr]);

  return {
    isQrModalOpen,
    isGeneratingQr,
    qrMatrix,
    qrDarkCells,
    qrErrorMessage,
    qrAppLinkUrl,
    openQrModal,
    closeQrModal,
    retryGenerateQr,
  };
}
