import QRCode from "qrcode";

const APP_DEEP_LINK_SCHEME = "client";
const APP_LINK_HOST = "boxit.app";

export type QrMatrix = {
  size: number;
  modules: boolean[];
};

export type GeneratedBoxQr = {
  deepLink: string;
  appLinkUrl: string;
  matrix: QrMatrix;
};

export function buildBoxDeepLink(boxId: string): string {
  const normalizedBoxId = boxId.trim();

  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  return `${APP_DEEP_LINK_SCHEME}://box/${encodeURIComponent(normalizedBoxId)}`;
}

export function buildBoxAppLink(boxId: string): string {
  const normalizedBoxId = boxId.trim();

  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  return `https://${APP_LINK_HOST}/box/${encodeURIComponent(normalizedBoxId)}`;
}

export function generateQrMatrix(value: string): QrMatrix {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("QR value is required.");
  }

  const qr = QRCode.create(normalizedValue, {
    errorCorrectionLevel: "M",
  });
  const size = qr.modules.size;
  const modules = Array.from(qr.modules.data, (value) => value === 1);

  return { size, modules };
}

export async function generateQrDataUrl(value: string, size = 640): Promise<string> {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("QR value is required.");
  }

  const svgMarkup = await QRCode.toString(normalizedValue, {
    type: "svg",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const encodedSvgMarkup = encodeURIComponent(svgMarkup)
    .replaceAll("'", "%27")
    .replaceAll('"', "%22");

  return `data:image/svg+xml;utf8,${encodedSvgMarkup}`;
}

export function generateBoxQrData(boxId: string): GeneratedBoxQr {
  const deepLink = buildBoxDeepLink(boxId);
  const appLinkUrl = buildBoxAppLink(boxId);
  const matrix = generateQrMatrix(appLinkUrl);

  return {
    deepLink,
    appLinkUrl,
    matrix,
  };
}
