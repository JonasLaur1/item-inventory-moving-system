import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeviceEventEmitter, PermissionsAndroid, Platform } from "react-native";
import { generateQrMatrix, type QrMatrix } from "@/utils/box-qr";

// Event names emitted by react-native-bluetooth-escpos-printer's BluetoothManager
const BT_EVENT_PAIRED = "EVENT_DEVICE_ALREADY_PAIRED";
const BT_EVENT_FOUND = "EVENT_DEVICE_FOUND";
const BT_EVENT_DONE = "EVENT_DEVICE_DISCOVER_DONE";

type BtModule = {
  BluetoothManager: {
    enableBluetooth: () => Promise<unknown>;
    scanDevices: () => Promise<string>;
    connect: (address: string) => Promise<void>;
  };
  BluetoothEscposPrinter: {
    sendRawData: (base64: string) => Promise<void>;
  };
};

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  } else {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
}

function loadBtModule(): BtModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-bluetooth-escpos-printer") as BtModule;
    if (!mod?.BluetoothManager || !mod?.BluetoothEscposPrinter) {
      return null;
    }
    return mod;
  } catch {
    return null;
  }
}

// ─── Brother QL raster protocol ────────────────────────────────────────────
// QL-820NWB: 300 dpi, 62 mm roll → 720 printable pixels = 90 bytes per line.
const BYTES_PER_LINE = 90;
const QUIET_ZONE_MODULES = 4;
const TOP_MARGIN_PX = 20;
const BOTTOM_MARGIN_PX = 20;
const TEXT_TO_QR_GAP_PX = 10;

// ─── Bitmap font ─────────────────────────────────────────────────────────────
// Classic 5×7 bitmap font for printable ASCII codes 32–126 (Adafruit GFX style).
// Each character: 5 bytes (columns left→right). Within each byte, bit 0 = top
// pixel, bit 7 = bottom. 8 pixel rows rendered per char: rows 0–6 are the
// glyph, row 7 is always blank (inter-line spacing).
// prettier-ignore
const FONT_DATA = new Uint8Array([
  0x00, 0x00, 0x00, 0x00, 0x00, // 32  (space)
  0x00, 0x00, 0x5F, 0x00, 0x00, // 33  !
  0x00, 0x07, 0x00, 0x07, 0x00, // 34  "
  0x14, 0x7F, 0x14, 0x7F, 0x14, // 35  #
  0x24, 0x2A, 0x7F, 0x2A, 0x12, // 36  $
  0x23, 0x13, 0x08, 0x64, 0x62, // 37  %
  0x36, 0x49, 0x55, 0x22, 0x50, // 38  &
  0x00, 0x05, 0x03, 0x00, 0x00, // 39  '
  0x00, 0x1C, 0x22, 0x41, 0x00, // 40  (
  0x00, 0x41, 0x22, 0x1C, 0x00, // 41  )
  0x14, 0x08, 0x3E, 0x08, 0x14, // 42  *
  0x08, 0x08, 0x3E, 0x08, 0x08, // 43  +
  0x00, 0x50, 0x30, 0x00, 0x00, // 44  ,
  0x08, 0x08, 0x08, 0x08, 0x08, // 45  -
  0x00, 0x60, 0x60, 0x00, 0x00, // 46  .
  0x20, 0x10, 0x08, 0x04, 0x02, // 47  /
  0x3E, 0x51, 0x49, 0x45, 0x3E, // 48  0
  0x00, 0x42, 0x7F, 0x40, 0x00, // 49  1
  0x42, 0x61, 0x51, 0x49, 0x46, // 50  2
  0x21, 0x41, 0x45, 0x4B, 0x31, // 51  3
  0x18, 0x14, 0x12, 0x7F, 0x10, // 52  4
  0x27, 0x45, 0x45, 0x45, 0x39, // 53  5
  0x3C, 0x4A, 0x49, 0x49, 0x30, // 54  6
  0x01, 0x71, 0x09, 0x05, 0x03, // 55  7
  0x36, 0x49, 0x49, 0x49, 0x36, // 56  8
  0x06, 0x49, 0x49, 0x29, 0x1E, // 57  9
  0x00, 0x36, 0x36, 0x00, 0x00, // 58  :
  0x00, 0x56, 0x36, 0x00, 0x00, // 59  ;
  0x08, 0x14, 0x22, 0x41, 0x00, // 60  <
  0x14, 0x14, 0x14, 0x14, 0x14, // 61  =
  0x00, 0x41, 0x22, 0x14, 0x08, // 62  >
  0x02, 0x01, 0x51, 0x09, 0x06, // 63  ?
  0x32, 0x49, 0x79, 0x41, 0x3E, // 64  @
  0x7E, 0x11, 0x11, 0x11, 0x7E, // 65  A
  0x7F, 0x49, 0x49, 0x49, 0x36, // 66  B
  0x3E, 0x41, 0x41, 0x41, 0x22, // 67  C
  0x7F, 0x41, 0x41, 0x22, 0x1C, // 68  D
  0x7F, 0x49, 0x49, 0x49, 0x41, // 69  E
  0x7F, 0x09, 0x09, 0x09, 0x01, // 70  F
  0x3E, 0x41, 0x49, 0x49, 0x7A, // 71  G
  0x7F, 0x08, 0x08, 0x08, 0x7F, // 72  H
  0x00, 0x41, 0x7F, 0x41, 0x00, // 73  I
  0x20, 0x40, 0x41, 0x3F, 0x01, // 74  J
  0x7F, 0x08, 0x14, 0x22, 0x41, // 75  K
  0x7F, 0x40, 0x40, 0x40, 0x40, // 76  L
  0x7F, 0x02, 0x0C, 0x02, 0x7F, // 77  M
  0x7F, 0x04, 0x08, 0x10, 0x7F, // 78  N
  0x3E, 0x41, 0x41, 0x41, 0x3E, // 79  O
  0x7F, 0x09, 0x09, 0x09, 0x06, // 80  P
  0x3E, 0x41, 0x51, 0x21, 0x5E, // 81  Q
  0x7F, 0x09, 0x19, 0x29, 0x46, // 82  R
  0x46, 0x49, 0x49, 0x49, 0x31, // 83  S
  0x01, 0x01, 0x7F, 0x01, 0x01, // 84  T
  0x3F, 0x40, 0x40, 0x40, 0x3F, // 85  U
  0x1F, 0x20, 0x40, 0x20, 0x1F, // 86  V
  0x3F, 0x40, 0x38, 0x40, 0x3F, // 87  W
  0x63, 0x14, 0x08, 0x14, 0x63, // 88  X
  0x07, 0x08, 0x70, 0x08, 0x07, // 89  Y
  0x61, 0x51, 0x49, 0x45, 0x43, // 90  Z
  0x00, 0x7F, 0x41, 0x41, 0x00, // 91  [
  0x02, 0x04, 0x08, 0x10, 0x20, // 92  backslash
  0x00, 0x41, 0x41, 0x7F, 0x00, // 93  ]
  0x04, 0x02, 0x01, 0x02, 0x04, // 94  ^
  0x40, 0x40, 0x40, 0x40, 0x40, // 95  _
  0x00, 0x01, 0x02, 0x04, 0x00, // 96  `
  0x20, 0x54, 0x54, 0x54, 0x78, // 97  a
  0x7F, 0x48, 0x44, 0x44, 0x38, // 98  b
  0x38, 0x44, 0x44, 0x44, 0x20, // 99  c
  0x38, 0x44, 0x44, 0x48, 0x7F, // 100 d
  0x38, 0x54, 0x54, 0x54, 0x18, // 101 e
  0x08, 0x7E, 0x09, 0x01, 0x02, // 102 f
  0x0C, 0x52, 0x52, 0x52, 0x3E, // 103 g
  0x7F, 0x08, 0x04, 0x04, 0x78, // 104 h
  0x00, 0x44, 0x7D, 0x40, 0x00, // 105 i
  0x20, 0x40, 0x44, 0x3D, 0x00, // 106 j
  0x7F, 0x10, 0x28, 0x44, 0x00, // 107 k
  0x00, 0x41, 0x7F, 0x40, 0x00, // 108 l
  0x7C, 0x04, 0x18, 0x04, 0x78, // 109 m
  0x7C, 0x08, 0x04, 0x04, 0x78, // 110 n
  0x38, 0x44, 0x44, 0x44, 0x38, // 111 o
  0x7C, 0x14, 0x14, 0x14, 0x08, // 112 p
  0x08, 0x14, 0x14, 0x18, 0x7C, // 113 q
  0x7C, 0x08, 0x04, 0x04, 0x08, // 114 r
  0x48, 0x54, 0x54, 0x54, 0x20, // 115 s
  0x04, 0x3F, 0x44, 0x40, 0x20, // 116 t
  0x3C, 0x40, 0x40, 0x40, 0x3C, // 117 u
  0x1C, 0x20, 0x40, 0x20, 0x1C, // 118 v
  0x3C, 0x40, 0x30, 0x40, 0x3C, // 119 w
  0x44, 0x28, 0x10, 0x28, 0x44, // 120 x
  0x0C, 0x50, 0x50, 0x50, 0x3C, // 121 y
  0x44, 0x64, 0x54, 0x4C, 0x44, // 122 z
  0x00, 0x08, 0x36, 0x41, 0x00, // 123 {
  0x00, 0x00, 0x7F, 0x00, 0x00, // 124 |
  0x00, 0x41, 0x36, 0x08, 0x00, // 125 }
  0x10, 0x08, 0x08, 0x10, 0x08, // 126 ~
]);

const FONT_CHAR_COLS = 5;
const FONT_CHAR_GAP = 1;
const FONT_CHAR_ROWS = 8; // 7 visible rows + 1 blank spacing row
const TEXT_SCALE = 4;         // render each font pixel as 4×4 physical pixels
const TEXT_MAX_CHARS_PER_LINE = 30; // 720px / (6px/char × 4) = 30 chars per line at TEXT_SCALE=4
const TEXT_LINE_GAP_PX = 4;  // blank rows between wrapped lines
const FRAGILE_SCALE = 5;      // render each font pixel as 5×5 physical pixels for FRAGILE banner
const FRAGILE_GAP_PX = 12;   // gap between QR code and FRAGILE banner
const FRAGILE_ICON_GAP_PX = 8; // gap between wine glass icon and FRAGILE text

// Outlined wine glass with diagonal crack (32 columns × 26 rows).
// Bit 31 = leftmost column (col 0), bit 0 = rightmost (col 31). Image is horizontally mirrored on print.
// prettier-ignore
const FRAGILE_ICON_WIDTH = 32;
// prettier-ignore
const FRAGILE_ICON_ROWS: number[] = [
  0x0FFFFFF0,  //  0: rim solid (cols 4-27)
  0x0FFFFFF0,  //  1: rim solid
  0x0C000030,  //  2: bowl outline cols 4-5, 26-27
  0x06000060,  //  3: bowl cols 5-6, 25-26
  0x030000C0,  //  4: bowl cols 6-7, 24-25
  0x01802180,  //  5: bowl cols 7-8, 23-24 + crack col 18
  0x00C04300,  //  6: bowl cols 8-9, 22-23 + crack col 17
  0x00608600,  //  7: bowl cols 9-10, 21-22 + crack col 16
  0x00310C00,  //  8: bowl cols 10-11, 20-21 + crack col 15
  0x00181800,  //  9: bowl cols 11-12, 19-20
  0x000C3000,  // 10: bowl cols 12-13, 18-19
  0x00066000,  // 11: bowl cols 13-14, 17-18
  0x0007E000,  // 12: bowl bottom solid cols 13-18
  0x00018000,  // 13: stem cols 15-16
  0x00018000,  // 14: stem
  0x00018000,  // 15: stem
  0x00018000,  // 16: stem
  0x00018000,  // 17: stem
  0x00018000,  // 18: stem
  0x00018000,  // 19: stem
  0x00018000,  // 20: stem
  0x001FF800,  // 21: base top cols 11-20
  0x00FFFF00,  // 22: base cols 8-23
  0x07FFFFE0,  // 23: base cols 5-26
  0x0FFFFFF0,  // 24: base solid cols 4-27
  0x0FFFFFF0,  // 25: base solid
];

function getCharCols(charCode: number): Uint8Array {
  const idx = charCode < 32 || charCode > 126 ? 63 - 32 : charCode - 32; // '?' fallback
  return FONT_DATA.subarray(idx * FONT_CHAR_COLS, idx * FONT_CHAR_COLS + FONT_CHAR_COLS);
}

/** Sanitise text so all characters are renderable by the bitmap font. */
function normalizeForFont(text: string): string {
  return text
    .replace(/\u2192/g, "->") // → right arrow
    .replace(/[\u2013\u2014]/g, "-") // en-dash / em-dash
    .replace(/[^\x20-\x7E]/g, "?"); // anything else non-ASCII
}

/** Wrap text at word boundaries so each line fits within maxChars. */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const chunk = word.slice(0, maxChars); // hard-cap single oversized words
    if (current.length === 0) {
      current = chunk;
    } else if (current.length + 1 + chunk.length <= maxChars) {
      current += " " + chunk;
    } else {
      lines.push(current);
      current = chunk;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Render a single text string into pixel-row raster lines using the bitmap font.
 * Returns (FONT_CHAR_ROWS × TEXT_SCALE) Uint8Arrays, each BYTES_PER_LINE bytes wide.
 */
function renderTextLine(text: string, scale = TEXT_SCALE): Uint8Array[] {
  const charWidthPx = (FONT_CHAR_COLS + FONT_CHAR_GAP) * scale;
  const leftPadPx = Math.max(0, Math.floor((BYTES_PER_LINE * 8 - text.length * charWidthPx) / 2));
  const totalRows = FONT_CHAR_ROWS * scale;

  const lines: Uint8Array[] = Array.from({ length: totalRows }, () => new Uint8Array(BYTES_PER_LINE));

  for (let ci = 0; ci < text.length; ci++) {
    const cols = getCharCols(text.charCodeAt(ci));
    const charStartPx = leftPadPx + ci * charWidthPx;

    for (let col = 0; col < FONT_CHAR_COLS; col++) {
      const colByte = cols[col];
      if (colByte === 0) continue;

      for (let row = 0; row < FONT_CHAR_ROWS; row++) {
        if (!((colByte >> row) & 1)) continue;

        for (let rs = 0; rs < scale; rs++) {
          const rasterRow = row * scale + rs;
          for (let cs = 0; cs < scale; cs++) {
            const pixX = charStartPx + col * scale + cs;
            if (pixX >= 0 && pixX < BYTES_PER_LINE * 8) {
              const mirX = BYTES_PER_LINE * 8 - 1 - pixX;
              lines[rasterRow][Math.floor(mirX / 8)] |= 1 << (7 - mirX % 8);
            }
          }
        }
      }
    }
  }

  return lines;
}

/** Render the wine glass icon bitmap centered on the label. */
function renderFragileIcon(scale = FRAGILE_SCALE): Uint8Array[] {
  const iconWidthPx = FRAGILE_ICON_WIDTH * scale;
  const leftPadPx = Math.max(0, Math.floor((BYTES_PER_LINE * 8 - iconWidthPx) / 2));
  const totalRows = FRAGILE_ICON_ROWS.length * scale;

  const lines: Uint8Array[] = Array.from({ length: totalRows }, () => new Uint8Array(BYTES_PER_LINE));

  for (let ri = 0; ri < FRAGILE_ICON_ROWS.length; ri++) {
    const rowBits = FRAGILE_ICON_ROWS[ri];
    for (let col = 0; col < FRAGILE_ICON_WIDTH; col++) {
      if (!((rowBits >> (FRAGILE_ICON_WIDTH - 1 - col)) & 1)) continue;
      for (let rs = 0; rs < scale; rs++) {
        const rasterRow = ri * scale + rs;
        for (let cs = 0; cs < scale; cs++) {
          const pixX = leftPadPx + col * scale + cs;
          if (pixX >= 0 && pixX < BYTES_PER_LINE * 8) {
            const mirX = BYTES_PER_LINE * 8 - 1 - pixX;
            lines[rasterRow][Math.floor(mirX / 8)] |= 1 << (7 - (mirX % 8));
          }
        }
      }
    }
  }

  return lines;
}

/**
 * Build a complete Brother QL raster print payload for a QR code.
 * Protocol reference: Brother P-touch Raster Command Reference (QL series).
 */
function buildBrotherRasterBytes(qrMatrix: QrMatrix, routeLabel?: string, fragile?: boolean): Uint8Array {
  const totalModules = qrMatrix.size + QUIET_ZONE_MODULES * 2;
  const modulePixels = Math.floor((BYTES_PER_LINE * 8) / totalModules);
  const qrAreaPixels = modulePixels * totalModules;
  const leftPadPx = Math.floor(((BYTES_PER_LINE * 8) - qrAreaPixels) / 2);
  const qrHeightPx = modulePixels * totalModules;

  const routeWrapped = routeLabel
    ? routeLabel.split("\n").flatMap((seg) => wrapText(normalizeForFont(seg), TEXT_MAX_CHARS_PER_LINE))
    : [];
  const routeRasterGroups = routeWrapped.map((line) => renderTextLine(line));
  const textSectionPx = routeRasterGroups.length > 0
    ? routeRasterGroups.reduce((sum, g) => sum + g.length, 0)
      + (routeRasterGroups.length - 1) * TEXT_LINE_GAP_PX
      + TEXT_TO_QR_GAP_PX
    : 0;

  const fragileIconLines = fragile ? renderFragileIcon() : [];
  const fragileLines = fragile ? renderTextLine("** FRAGILE **", FRAGILE_SCALE) : [];
  const fragileSectionPx = fragileLines.length > 0
    ? FRAGILE_GAP_PX + fragileIconLines.length + FRAGILE_ICON_GAP_PX + fragileLines.length
    : 0;

  const buildRasterLine = (pixRow: number): Uint8Array => {
    const modRow = Math.floor(pixRow / modulePixels) - QUIET_ZONE_MODULES;
    const line = new Uint8Array(BYTES_PER_LINE);
    for (let pixCol = 0; pixCol < BYTES_PER_LINE * 8; pixCol++) {
      const modCol = Math.floor((pixCol - leftPadPx) / modulePixels) - QUIET_ZONE_MODULES;
      const dark =
        modRow >= 0 && modRow < qrMatrix.size &&
        modCol >= 0 && modCol < qrMatrix.size &&
        qrMatrix.modules[modRow * qrMatrix.size + modCol] === true;
      if (dark) {
        line[Math.floor(pixCol / 8)] |= 1 << (7 - pixCol % 8);
      }
    }
    return line;
  };

  const blankLine = new Uint8Array(BYTES_PER_LINE);
  const numRasterLines = TOP_MARGIN_PX + textSectionPx + qrHeightPx + fragileSectionPx + BOTTOM_MARGIN_PX;

  // Assemble protocol commands
  const parts: Uint8Array[] = [];

  // 1. Invalidate (clear printer buffer)
  parts.push(new Uint8Array(200));
  // 2. Initialize
  parts.push(new Uint8Array([0x1b, 0x40]));
  // 3. Switch to raster graphics mode
  parts.push(new Uint8Array([0x1b, 0x69, 0x61, 0x01]));
  // 4. Print information: ESC i z (10 parameter bytes)
  //    DK-22251: 62 mm continuous black/red roll on QL-820NWB.
  //    PI=0x00 (no validation), QI=0x0A (continuous), W=62 mm, L=0 (continuous).
  parts.push(new Uint8Array([
    0x1b, 0x69, 0x7a,
    0x80,                                  // PI: no media validation
    0x0a,                                  // QI: continuous tape
    62,                                    // W: 62 mm
    0,                                     // L: continuous
    numRasterLines & 0xff,
    (numRasterLines >> 8) & 0xff,
    (numRasterLines >> 16) & 0xff,
    (numRasterLines >> 24) & 0xff,
    0x00,                                  // starting page
    0x00,                                  // reserved
  ]));
  // 5. Various mode: auto-cut enabled (bit 6 = 0x40)
  parts.push(new Uint8Array([0x1b, 0x69, 0x4d, 0x40]));
  // 6. Advanced mode: cut at end (0x01), not chain printing (0x08)
  parts.push(new Uint8Array([0x1b, 0x69, 0x4b, 0x01]));
  // 7. Compression: none
  parts.push(new Uint8Array([0x4d, 0x00]));

  // DK-22251 (black + red two-color): must use `w` (0x77) with two separate plane commands
  // per line — single-plane `g` (0x67) commands cause "wrong roll type" on the QL-820NWB.
  const emptyPlane = new Uint8Array(BYTES_PER_LINE);
  const pushLine = (data: Uint8Array): void => {
    parts.push(new Uint8Array([0x77, 0x01, BYTES_PER_LINE, ...data]));       // black plane
    parts.push(new Uint8Array([0x77, 0x02, BYTES_PER_LINE, ...emptyPlane])); // red plane (empty)
  };
  const pushRedLine = (data: Uint8Array): void => {
    parts.push(new Uint8Array([0x77, 0x01, BYTES_PER_LINE, ...emptyPlane])); // black plane (empty)
    parts.push(new Uint8Array([0x77, 0x02, BYTES_PER_LINE, ...data]));       // red plane
  };

  // 8. Raster lines: top margin + optional route label + gap + QR code + optional FRAGILE banner + bottom margin
  for (let i = 0; i < TOP_MARGIN_PX; i++) pushLine(blankLine);
  for (let gi = 0; gi < routeRasterGroups.length; gi++) {
    for (const line of routeRasterGroups[gi]) pushLine(line);
    if (gi < routeRasterGroups.length - 1) {
      for (let i = 0; i < TEXT_LINE_GAP_PX; i++) pushLine(blankLine);
    }
  }
  for (let i = 0; i < (routeRasterGroups.length > 0 ? TEXT_TO_QR_GAP_PX : 0); i++) pushLine(blankLine);
  for (let row = 0; row < qrHeightPx; row++) pushLine(buildRasterLine(row));
  for (let i = 0; i < (fragileLines.length > 0 ? FRAGILE_GAP_PX : 0); i++) pushLine(blankLine);
  for (const line of fragileIconLines) pushRedLine(line);
  for (let i = 0; i < (fragileLines.length > 0 ? FRAGILE_ICON_GAP_PX : 0); i++) pushLine(blankLine);
  for (const line of fragileLines) pushRedLine(line);
  for (let i = 0; i < BOTTOM_MARGIN_PX; i++) pushLine(blankLine);

  // 9. Print with feeding
  parts.push(new Uint8Array([0x1a]));

  // Concatenate all parts into one buffer
  const totalBytes = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Convert Uint8Array to base64 string without using Buffer (works in Hermes). */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return btoa(binary);
}

// ─── Storage keys ───────────────────────────────────────────────────────────
const STORAGE_KEY_ADDRESS = "@boxit/bt-printer-address";
const STORAGE_KEY_NAME = "@boxit/bt-printer-name";

export type BluetoothDevice = {
  address: string;
  name: string;
};

export type UseBluetoothPrinterResult = {
  savedPrinter: BluetoothDevice | null;
  pairedDevices: BluetoothDevice[];
  isScanning: boolean;
  scanError: string | null;
  isPrinting: boolean;
  printError: string | null;
  prepareScan: () => Promise<void>;
  rescan: () => Promise<void>;
  selectPrinter: (device: BluetoothDevice) => Promise<void>;
  forgetPrinter: () => Promise<void>;
  printLabel: (boxName: string, qrValue: string, routeLabel?: string, fragile?: boolean) => Promise<void>;
};

export function useBluetoothPrinter(): UseBluetoothPrinterResult {
  const [savedPrinter, setSavedPrinter] = useState<BluetoothDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const subscriptionsRef = useRef<{ remove: () => void }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [address, name] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_ADDRESS),
          AsyncStorage.getItem(STORAGE_KEY_NAME),
        ]);
        if (address) {
          setSavedPrinter({ address, name: name ?? address });
        }
      } catch {
        // ignore storage errors on mount
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.remove());
    };
  }, []);

  const removeListeners = useCallback(() => {
    subscriptionsRef.current.forEach((sub) => sub.remove());
    subscriptionsRef.current = [];
  }, []);

  const startScan = useCallback(async () => {
    const btModule = loadBtModule();
    if (!btModule) {
      setScanError("Bluetooth printing is not available on this device.");
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setPairedDevices([]);
    removeListeners();

    const sub1 = DeviceEventEmitter.addListener(BT_EVENT_PAIRED, (event: { devices: string }) => {
      try {
        const devices = JSON.parse(event.devices) as BluetoothDevice[];
        setPairedDevices(devices.filter((d) => Boolean(d.name) && Boolean(d.address)));
      } catch {
        // ignore parse errors
      }
    });

    const sub2 = DeviceEventEmitter.addListener(BT_EVENT_FOUND, (event: { device: string }) => {
      try {
        const device = JSON.parse(event.device) as BluetoothDevice;
        if (device.name && device.address) {
          setPairedDevices((prev) =>
            prev.some((d) => d.address === device.address) ? prev : [...prev, device],
          );
        }
      } catch {
        // ignore parse errors
      }
    });

    const sub3 = DeviceEventEmitter.addListener(BT_EVENT_DONE, () => {
      setIsScanning(false);
      removeListeners();
    });

    subscriptionsRef.current = [sub1, sub2, sub3];

    try {
      await btModule.BluetoothManager.scanDevices();
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Failed to scan for Bluetooth devices.");
      setIsScanning(false);
      removeListeners();
    }
  }, [removeListeners]);

  const prepareScan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);
    setPairedDevices([]);

    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      setScanError(
        "Bluetooth permissions are required. Please allow them when prompted, or enable them in Settings > Apps > BoxIt > Permissions.",
      );
      setIsScanning(false);
      return;
    }

    const btModule = loadBtModule();
    if (!btModule) {
      setScanError("Bluetooth printing is not available on this device.");
      setIsScanning(false);
      return;
    }

    try {
      await btModule.BluetoothManager.enableBluetooth();
    } catch {
      setScanError("Please enable Bluetooth and try again.");
      setIsScanning(false);
      return;
    }

    await startScan();
  }, [startScan]);

  const rescan = useCallback(async () => {
    await startScan();
  }, [startScan]);

  const selectPrinter = useCallback(async (device: BluetoothDevice) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEY_ADDRESS, device.address],
      [STORAGE_KEY_NAME, device.name],
    ]);
    setSavedPrinter(device);
  }, []);

  const forgetPrinter = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEY_ADDRESS, STORAGE_KEY_NAME]);
    setSavedPrinter(null);
  }, []);

  const printLabel = useCallback(
    async (_boxName: string, qrValue: string, routeLabel?: string, fragile?: boolean) => {
      if (!savedPrinter) {
        setPrintError("No printer selected. Tap 'Select Printer' first.");
        return;
      }

      const btModule = loadBtModule();
      if (!btModule) {
        setPrintError("Bluetooth printing is not available on this device.");
        return;
      }

      if (typeof btModule.BluetoothEscposPrinter.sendRawData !== "function") {
        setPrintError("sendRawData not available – rebuild the app after the patch.");
        return;
      }

      setIsPrinting(true);
      setPrintError(null);

      try {
        console.log("[BTPrint] connecting to", savedPrinter.address);
        await btModule.BluetoothManager.connect(savedPrinter.address);
        console.log("[BTPrint] connected, waiting 500ms");
        await new Promise<void>((resolve) => setTimeout(resolve, 500));

        console.log("[BTPrint] generating QR matrix for", qrValue);
        const qrMatrix = generateQrMatrix(qrValue);

        console.log("[BTPrint] building Brother raster payload");
        const payload = buildBrotherRasterBytes(qrMatrix, routeLabel, fragile);
        const base64 = toBase64(payload);
        console.log("[BTPrint] sending", payload.length, "bytes via sendRawData");

        await btModule.BluetoothEscposPrinter.sendRawData(base64);
        console.log("[BTPrint] done");
      } catch (error) {
        console.log("[BTPrint] error", error);
        const msg =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error);
        setPrintError(msg || "Printing failed. Make sure the printer is on and paired.");
      } finally {
        setIsPrinting(false);
      }
    },
    [savedPrinter],
  );

  return {
    savedPrinter,
    pairedDevices,
    isScanning,
    scanError,
    isPrinting,
    printError,
    prepareScan,
    rescan,
    selectPrinter,
    forgetPrinter,
    printLabel,
  };
}
