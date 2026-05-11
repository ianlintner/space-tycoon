import { describe, it, expect, vi } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import {
  fillChamferedRect,
  strokeChamferedRect,
  traceChamferedPath,
  chamferedRectPoints,
} from "../../foundation/shapes.ts";

describe("chamferedRectPoints", () => {
  it("returns 8 vertices for a non-zero chamfer", () => {
    const pts = chamferedRectPoints(0, 0, 100, 50, 8);
    expect(pts).toEqual([
      8, 0, 92, 0, 100, 8, 100, 42, 92, 50, 8, 50, 0, 42, 0, 8,
    ]);
  });

  it("clamps chamfer to half of the shorter side", () => {
    // 20×40 box with chamfer=15 → clamped to 10.
    const pts = chamferedRectPoints(0, 0, 20, 40, 15);
    expect(pts[0]).toBe(10);
    expect(pts[1]).toBe(0);
  });

  it("returns 4 corner-equivalent points when chamfer is 0", () => {
    const pts = chamferedRectPoints(0, 0, 100, 50, 0);
    expect(pts).toEqual([
      0, 0, 100, 0, 100, 0, 100, 50, 100, 50, 0, 50, 0, 50, 0, 0,
    ]);
  });
});

describe("fillChamferedRect", () => {
  function makeRecorder() {
    const calls: Array<[string, unknown[]]> = [];
    return {
      calls,
      g: {
        beginPath: (...a: unknown[]) => (
          calls.push(["beginPath", a]),
          undefined
        ),
        moveTo: (...a: unknown[]) => (calls.push(["moveTo", a]), undefined),
        lineTo: (...a: unknown[]) => (calls.push(["lineTo", a]), undefined),
        closePath: (...a: unknown[]) => (
          calls.push(["closePath", a]),
          undefined
        ),
        fillPath: (...a: unknown[]) => (calls.push(["fillPath", a]), undefined),
        strokePath: (...a: unknown[]) => (
          calls.push(["strokePath", a]),
          undefined
        ),
      },
    };
  }

  it("traces the 8 chamfered vertices and fills", () => {
    const r = makeRecorder();
    fillChamferedRect(r.g as never, 0, 0, 100, 50, 8);
    const kinds = r.calls.map((c) => c[0]);
    expect(kinds).toEqual([
      "beginPath",
      "moveTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "closePath",
      "fillPath",
    ]);
    expect(r.calls[1][1]).toEqual([8, 0]);
    expect(r.calls[2][1]).toEqual([92, 0]);
    expect(r.calls[8][1]).toEqual([0, 8]);
  });

  it("falls back to plain rect path when chamfer is 0", () => {
    const r = makeRecorder();
    fillChamferedRect(r.g as never, 0, 0, 100, 50, 0);
    expect(r.calls[1][1]).toEqual([0, 0]);
    expect(r.calls.some((c) => c[0] === "fillPath")).toBe(true);
  });
});

describe("strokeChamferedRect", () => {
  it("ends with strokePath instead of fillPath", () => {
    const calls: Array<[string, unknown[]]> = [];
    const g = {
      beginPath: (...a: unknown[]) => calls.push(["beginPath", a]),
      moveTo: (...a: unknown[]) => calls.push(["moveTo", a]),
      lineTo: (...a: unknown[]) => calls.push(["lineTo", a]),
      closePath: (...a: unknown[]) => calls.push(["closePath", a]),
      strokePath: (...a: unknown[]) => calls.push(["strokePath", a]),
    };
    strokeChamferedRect(g as never, 0, 0, 100, 50, 8);
    expect(calls[calls.length - 1][0]).toBe("strokePath");
  });
});

describe("traceChamferedPath (Canvas2D)", () => {
  it("calls moveTo + 7 lineTo + closePath on a Canvas2D context", () => {
    const calls: Array<[string, unknown[]]> = [];
    const ctx = {
      beginPath: (...a: unknown[]) => calls.push(["beginPath", a]),
      moveTo: (...a: unknown[]) => calls.push(["moveTo", a]),
      lineTo: (...a: unknown[]) => calls.push(["lineTo", a]),
      closePath: (...a: unknown[]) => calls.push(["closePath", a]),
    };
    traceChamferedPath(ctx as never, 0, 0, 100, 50, 8);
    const kinds = calls.map((c) => c[0]);
    expect(kinds).toEqual([
      "beginPath",
      "moveTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "closePath",
    ]);
  });
});
