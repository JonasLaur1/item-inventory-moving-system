import type { BoxDetailsItem } from "@/lib/box.service";
import {
  clampToEditableStatus,
  editableStatuses,
  formatStatusLabel,
  formatUpdatedAt,
  mapItemToRow,
  parseQuantity,
} from "@/utils/box-detail-utils";

describe("editableStatuses", () => {
  it("contains exactly packed and unpacked entries", () => {
    expect(editableStatuses).toHaveLength(2);
    const values = editableStatuses.map((s) => s.value);
    expect(values).toContain("packed");
    expect(values).toContain("unpacked");
  });
});

describe("formatUpdatedAt", () => {
  it('returns "Unknown" for null input', () => {
    expect(formatUpdatedAt(null)).toBe("Unknown");
  });

  it("returns a relative string for a valid recent ISO date", () => {
    const recentIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatUpdatedAt(recentIso)).toBe("5m ago");
  });

  it("returns a days-relative string for an older ISO date", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatUpdatedAt(twoDaysAgo)).toBe("2d ago");
  });
});

describe("formatStatusLabel", () => {
  it('returns "Packed" for "packed"', () => {
    expect(formatStatusLabel("packed")).toBe("Packed");
  });

  it('returns "Delivered" for "delivered"', () => {
    expect(formatStatusLabel("delivered")).toBe("Delivered");
  });

  it('returns "Unpacked" for "unpacked_at_destination"', () => {
    expect(formatStatusLabel("unpacked_at_destination")).toBe("Unpacked");
  });

  it('returns "Not packed" for "unpacked"', () => {
    expect(formatStatusLabel("unpacked")).toBe("Not packed");
  });

  it('returns "Not packed" for unknown status', () => {
    expect(formatStatusLabel("something_else")).toBe("Not packed");
  });
});

describe("clampToEditableStatus", () => {
  it('returns "packed" when status is "packed"', () => {
    expect(clampToEditableStatus("packed")).toBe("packed");
  });

  it('returns "unpacked" for any other status', () => {
    expect(clampToEditableStatus("delivered")).toBe("unpacked");
    expect(clampToEditableStatus("unpacked_at_destination")).toBe("unpacked");
    expect(clampToEditableStatus("unpacked")).toBe("unpacked");
    expect(clampToEditableStatus("unknown")).toBe("unpacked");
  });
});

describe("parseQuantity", () => {
  it("returns null for empty string", () => {
    expect(parseQuantity("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseQuantity("   ")).toBeNull();
  });

  it("returns null for non-integer input", () => {
    expect(parseQuantity("1.5")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
  });

  it("returns null for values less than 1", () => {
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("-1")).toBeNull();
  });

  it("returns the integer for a valid positive integer", () => {
    expect(parseQuantity("3")).toBe(3);
    expect(parseQuantity("100")).toBe(100);
  });

  it("trims whitespace before parsing", () => {
    expect(parseQuantity("  5  ")).toBe(5);
  });
});

describe("mapItemToRow", () => {
  const baseItem: BoxDetailsItem = {
    id: "item-1",
    name: "Plates",
    notes: "Handle with care",
    quantity: 6,
    isFragile: true,
    photoUrl: "https://example.com/photo.jpg",
  };

  it("maps all fields correctly", () => {
    const row = mapItemToRow(baseItem);
    expect(row.id).toBe("item-1");
    expect(row.title).toBe("Plates");
    expect(row.subtitle).toBe("Handle with care");
    expect(row.quantity).toBe(6);
    expect(row.isFragile).toBe(true);
    expect(row.icon).toBe("package");
    expect(row.photoUrl).toBe("https://example.com/photo.jpg");
  });

  it("sets subtitle to undefined when notes is null", () => {
    const row = mapItemToRow({ ...baseItem, notes: null });
    expect(row.subtitle).toBeUndefined();
  });

  it("sets subtitle to undefined when notes is whitespace-only", () => {
    const row = mapItemToRow({ ...baseItem, notes: "   " });
    expect(row.subtitle).toBeUndefined();
  });

  it("sets subtitle to undefined when notes is empty string", () => {
    const row = mapItemToRow({ ...baseItem, notes: "" });
    expect(row.subtitle).toBeUndefined();
  });
});
