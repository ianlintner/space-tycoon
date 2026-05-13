import { describe, it, expect } from "vitest";
import { filterAutocomplete, matchScore } from "../autocompleteMatch.ts";

const SYSTEMS = [
  { id: "s1", label: "Helios" },
  { id: "s2", label: "Helios Prime" },
  { id: "s3", label: "Velura" },
  { id: "s4", label: "Velura-4" },
  { id: "s5", label: "Zhul-6" },
  { id: "s6", label: "New Helios" },
  { id: "s7", label: "Andromeda Outpost" },
];

describe("matchScore", () => {
  it("scores prefix matches 0", () => {
    expect(matchScore("hel", "Helios")).toBe(0);
  });

  it("scores word-boundary matches 1", () => {
    expect(matchScore("hel", "New Helios")).toBe(1);
    expect(matchScore("4", "Velura-4")).toBe(1);
  });

  it("scores other infix matches 2", () => {
    expect(matchScore("dro", "Andromeda Outpost")).toBe(2);
  });

  it("returns -1 for no match", () => {
    expect(matchScore("xyz", "Helios")).toBe(-1);
  });

  it("is case-insensitive", () => {
    expect(matchScore("HELIOS", "helios")).toBe(0);
    expect(matchScore("helios", "HELIOS")).toBe(0);
  });
});

describe("filterAutocomplete", () => {
  it("returns empty list for empty query by default", () => {
    expect(filterAutocomplete(SYSTEMS, "")).toEqual([]);
  });

  it("returns up to `limit` candidates when showAllOnEmpty=true", () => {
    const result = filterAutocomplete(SYSTEMS, "", {
      showAllOnEmpty: true,
      limit: 3,
    });
    expect(result.map((r) => r.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("ranks prefix matches above infix matches", () => {
    const result = filterAutocomplete(SYSTEMS, "hel");
    // Prefix: Helios, Helios Prime
    // Word-boundary: New Helios
    expect(result.map((r) => r.label)).toEqual([
      "Helios",
      "Helios Prime",
      "New Helios",
    ]);
  });

  it("breaks ties alphabetically", () => {
    const result = filterAutocomplete(SYSTEMS, "vel");
    expect(result.map((r) => r.label)).toEqual(["Velura", "Velura-4"]);
  });

  it("respects the limit", () => {
    const result = filterAutocomplete(SYSTEMS, "e", { limit: 2 });
    expect(result.length).toBe(2);
  });

  it("ignores leading/trailing whitespace", () => {
    expect(filterAutocomplete(SYSTEMS, "  hel  ").map((r) => r.id)).toEqual([
      "s1",
      "s2",
      "s6",
    ]);
  });
});
