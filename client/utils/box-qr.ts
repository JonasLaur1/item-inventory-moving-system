import QRCode from "qrcode";

const APP_DEEP_LINK_SCHEME = "client";
const DEFAULT_QR_SIZE = 320;

export type GeneratedBoxQr = {
  deepLink: string;
  dataUrl: string;
};

export function buildBoxDeepLink(boxId: string): string {
  const normalizedBoxId = boxId.trim();

  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  return `${APP_DEEP_LINK_SCHEME}://box/${encodeURIComponent(normalizedBoxId)}`;
}

export async function generateQrDataUrl(value: string, size = DEFAULT_QR_SIZE): Promise<string> {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("QR value is required.");
  }

  return QRCode.toDataURL(normalizedValue, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

export async function generateBoxQrDataUrl(boxId: string, size = DEFAULT_QR_SIZE): Promise<GeneratedBoxQr> {
  const deepLink = buildBoxDeepLink(boxId);
  const dataUrl = await generateQrDataUrl(deepLink, size);

  return {
    deepLink,
    dataUrl,
  };
}
