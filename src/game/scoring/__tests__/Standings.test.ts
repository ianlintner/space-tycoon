import { describe, it, expect } from "vitest";
import { formatRankDelta, formatStandingsChip } from "../Standings.ts";

const base = { of: 5, gapToLeader: 0, leadOverSecond: 0 };

describe("formatStandingsChip", () => {
  it("shows the gap to #1 when trailing", () => {
    expect(formatStandingsChip({ ...base, rank: 3, gapToLeader: 1234 })).toBe(
      "Rank #3/5 · −§1,234 to #1",
    );
    expect(formatStandingsChip({ ...base, rank: 2, gapToLeader: 45_000 })).toBe(
      "Rank #2/5 · −§45K to #1",
    );
    expect(
      formatStandingsChip({ ...base, rank: 5, gapToLeader: 2_500_000 }),
    ).toBe("Rank #5/5 · −§2.5M to #1");
  });
  it("shows the lead when ranked first", () => {
    expect(formatStandingsChip({ ...base, rank: 1, leadOverSecond: 800 })).toBe(
      "Rank #1/5 · +§800 lead",
    );
    expect(formatStandingsChip({ ...base, rank: 1 })).toBe(
      "Rank #1/5 · leading",
    );
  });
  it("has a compact form", () => {
    expect(formatStandingsChip({ ...base, rank: 4 }, true)).toBe("#4/5");
  });
});

describe("formatRankDelta", () => {
  it("formats movement", () => {
    expect(formatRankDelta(4, 2)).toBe("▲2");
    expect(formatRankDelta(1, 2)).toBe("▼1");
    expect(formatRankDelta(3, 3)).toBe("=");
    expect(formatRankDelta(undefined, 3)).toBe("");
  });
});
