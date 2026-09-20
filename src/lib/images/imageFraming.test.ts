import { describe, expect, it } from "vitest";
import { framedImageGeometry } from "./imageFraming";

describe("image framing geometry", () => {
  it("fits a landscape image completely inside a portrait frame", () => {
    expect(
      framedImageGeometry(1600, 900, 800, 1000, { zoom: 1, x: 0, y: 0 }),
    ).toEqual({ width: 800, height: 450, left: 0, top: 275 });
  });

  it("applies zoom and normalized positioning", () => {
    expect(
      framedImageGeometry(800, 1000, 800, 1000, {
        zoom: 2,
        x: 0.5,
        y: -0.5,
      }),
    ).toEqual({ width: 1600, height: 2000, left: -200, top: -750 });
  });
});
