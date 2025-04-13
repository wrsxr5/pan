import { describe, expect, it } from "bun:test";
import { fromBase64, toBase64 } from "./util";

describe("Util", () => {
  it("should encode base64", () => {
    expect(toBase64(undefined)).toBe("");
    expect(toBase64(null)).toBe("yyvNyQEA");
    expect(toBase64(0)).toBe("MwAA");
    expect(toBase64(false)).toBe("S0vMKU4FAA==");
    expect(toBase64([])).toBe("i44FAA==");
    expect(toBase64({})).toBe("q64FAA==");
  });

  it("should decode base64", () => {
    expect(fromBase64("")).toBeUndefined();
    expect(fromBase64("yyvNyQEA")).toBe(null);
    expect(fromBase64("MwAA")).toBe(0);
    expect(fromBase64("S0vMKU4FAA==")).toBe(false);
    expect(fromBase64("i44FAA==")).toBeArrayOfSize(0);
    expect(fromBase64("q64FAA==")).toBeEmptyObject();
  });
});
