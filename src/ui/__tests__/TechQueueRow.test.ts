import { describe, it, expect } from "vitest";
// TechQueueRow requires Phaser — just verify it's importable as a module
// by importing only the interface types

describe("TechQueueRow module", () => {
  it("can be imported without errors", async () => {
    // Dynamic import to avoid Phaser instantiation at module load
    const mod = await import("../TechQueueRow.ts");
    expect(mod.TechQueueRow).toBeDefined();
  });
});
