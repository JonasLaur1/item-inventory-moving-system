import {
  buildBoxAppLink,
  buildBoxDeepLink,
  generateBoxQrData,
  generateQrDataUrl,
  generateQrMatrix,
} from "@/utils/box-qr";

describe("buildBoxDeepLink", () => {
  it("returns correct deep link for a normal id", () => {
    expect(buildBoxDeepLink("abc-123")).toBe("client://box/abc-123");
  });

  it("trims whitespace from the id", () => {
    expect(buildBoxDeepLink("  abc-123  ")).toBe("client://box/abc-123");
  });

  it("throws for an empty string", () => {
    expect(() => buildBoxDeepLink("")).toThrow("Box id is required.");
  });

  it("throws for a whitespace-only string", () => {
    expect(() => buildBoxDeepLink("   ")).toThrow("Box id is required.");
  });

  it("URL-encodes special characters in the id", () => {
    expect(buildBoxDeepLink("box/1")).toBe("client://box/box%2F1");
  });
});

describe("buildBoxAppLink", () => {
  it("returns correct HTTPS link for a normal id", () => {
    expect(buildBoxAppLink("abc-123")).toBe("https://boxit.app/box/abc-123");
  });

  it("trims whitespace from the id", () => {
    expect(buildBoxAppLink("  abc-123  ")).toBe("https://boxit.app/box/abc-123");
  });

  it("throws for an empty string", () => {
    expect(() => buildBoxAppLink("")).toThrow("Box id is required.");
  });

  it("throws for a whitespace-only string", () => {
    expect(() => buildBoxAppLink("   ")).toThrow("Box id is required.");
  });
});

describe("generateQrMatrix", () => {
  it("throws for an empty string", () => {
    expect(() => generateQrMatrix("")).toThrow("QR value is required.");
  });

  it("throws for a whitespace-only string", () => {
    expect(() => generateQrMatrix("   ")).toThrow("QR value is required.");
  });

  it("returns a matrix with a numeric size", () => {
    const { size } = generateQrMatrix("hello");
    expect(typeof size).toBe("number");
    expect(size).toBeGreaterThan(0);
  });

  it("returns modules array with length equal to size * size", () => {
    const { size, modules } = generateQrMatrix("hello");
    expect(modules).toHaveLength(size * size);
  });

  it("returns modules as booleans", () => {
    const { modules } = generateQrMatrix("hello");
    expect(modules.every((m) => typeof m === "boolean")).toBe(true);
  });
});

describe("generateQrDataUrl", () => {
  it("throws for an empty string", async () => {
    await expect(generateQrDataUrl("")).rejects.toThrow("QR value is required.");
  });

  it("throws for a whitespace-only string", async () => {
    await expect(generateQrDataUrl("   ")).rejects.toThrow("QR value is required.");
  });

  it("returns a data URI starting with data:image/svg+xml", async () => {
    const url = await generateQrDataUrl("https://boxit.app/box/test-id");
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
  });
});

describe("generateBoxQrData", () => {
  it("returns an object with deepLink, appLinkUrl, and matrix", () => {
    const result = generateBoxQrData("test-box-id");
    expect(result).toHaveProperty("deepLink");
    expect(result).toHaveProperty("appLinkUrl");
    expect(result).toHaveProperty("matrix");
  });

  it("deepLink starts with the correct scheme", () => {
    const { deepLink } = generateBoxQrData("test-box-id");
    expect(deepLink.startsWith("client://box/")).toBe(true);
  });

  it("appLinkUrl starts with the correct HTTPS host", () => {
    const { appLinkUrl } = generateBoxQrData("test-box-id");
    expect(appLinkUrl.startsWith("https://boxit.app/box/")).toBe(true);
  });

  it("matrix has correct structure", () => {
    const { matrix } = generateBoxQrData("test-box-id");
    expect(typeof matrix.size).toBe("number");
    expect(matrix.modules).toHaveLength(matrix.size * matrix.size);
  });
});
