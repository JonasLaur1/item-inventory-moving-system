import { getLocationIcon } from "@/utils/location-icon";

const LOCATION_ICONS = [
  "silverware-fork-knife",
  "sofa-outline",
  "bed-king-outline",
  "garage-variant",
  "desk",
  "bathtub-outline",
  "door-sliding",
  "toolbox-outline",
  "archive-outline",
  "bookshelf",
] as const;

describe("getLocationIcon — keyword matching", () => {
  it('returns silverware-fork-knife for names containing "kitchen"', () => {
    expect(getLocationIcon("Kitchen")).toBe("silverware-fork-knife");
  });

  it('returns sofa-outline for names containing "living"', () => {
    expect(getLocationIcon("Living Room")).toBe("sofa-outline");
  });

  it('returns bed-king-outline for names containing "bed"', () => {
    expect(getLocationIcon("Bedroom")).toBe("bed-king-outline");
  });

  it('returns garage-variant for names containing "garage"', () => {
    expect(getLocationIcon("Garage")).toBe("garage-variant");
  });

  it('returns bathtub-outline for names containing "bath"', () => {
    expect(getLocationIcon("Bathroom")).toBe("bathtub-outline");
  });

  it('returns desk for names containing "office"', () => {
    expect(getLocationIcon("Home Office")).toBe("desk");
  });
});

describe("getLocationIcon — case insensitivity and trimming", () => {
  it("matches keyword regardless of case", () => {
    expect(getLocationIcon("KITCHEN")).toBe("silverware-fork-knife");
    expect(getLocationIcon("kItChEn")).toBe("silverware-fork-knife");
  });

  it("trims leading and trailing whitespace before matching", () => {
    expect(getLocationIcon("  kitchen  ")).toBe("silverware-fork-knife");
  });
});

describe("getLocationIcon — unknown names", () => {
  it("returns a value from the LOCATION_ICONS array for unknown names", () => {
    const icon = getLocationIcon("Attic");
    expect(LOCATION_ICONS).toContain(icon);
  });

  it("never returns undefined for unknown names", () => {
    expect(getLocationIcon("Random Room")).toBeDefined();
    expect(getLocationIcon("Storage")).toBeDefined();
    expect(getLocationIcon("123")).toBeDefined();
  });

  it("returns the same icon for the same unknown name (stable hashing)", () => {
    const first = getLocationIcon("Attic");
    const second = getLocationIcon("Attic");
    expect(first).toBe(second);
  });

  it("hashing is case-insensitive and whitespace-trimmed", () => {
    const lower = getLocationIcon("attic");
    const upper = getLocationIcon("ATTIC");
    const padded = getLocationIcon("  attic  ");
    expect(lower).toBe(upper);
    expect(lower).toBe(padded);
  });
});
