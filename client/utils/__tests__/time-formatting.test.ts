import { formatRelativeTime, getMinutesAgo } from "@/utils/time-formatting";

describe("getMinutesAgo", () => {
  it("clamps to 0 for future timestamps", () => {
    const now = Date.now();
    expect(getMinutesAgo(new Date(now + 60_000).toISOString(), now)).toBe(0);
  });

  it("returns correct minutes for past timestamps", () => {
    const now = Date.now();
    expect(getMinutesAgo(new Date(now - 90 * 60_000).toISOString(), now)).toBe(90);
  });

  it("returns Infinity for an invalid ISO string", () => {
    expect(getMinutesAgo("not-a-date", Date.now())).toBe(
      Number.POSITIVE_INFINITY
    );
  });
});

describe("formatRelativeTime", () => {
  it('returns "Just now" for 0 minutes', () => {
    expect(formatRelativeTime(0)).toBe("Just now");
  });

  it("returns minutes format for under 60 minutes", () => {
    expect(formatRelativeTime(45)).toBe("45m ago");
  });

  it("returns hours format for 60–1439 minutes", () => {
    expect(formatRelativeTime(120)).toBe("2h ago");
    expect(formatRelativeTime(90)).toBe("1h ago");
  });

  it("returns days format for 1440+ minutes", () => {
    expect(formatRelativeTime(1440)).toBe("1d ago");
    expect(formatRelativeTime(2880)).toBe("2d ago");
  });

  it('returns "Unknown" for negative input', () => {
    expect(formatRelativeTime(-1)).toBe("Unknown");
  });

  it('returns "Unknown" for Infinity', () => {
    expect(formatRelativeTime(Number.POSITIVE_INFINITY)).toBe("Unknown");
  });
});
