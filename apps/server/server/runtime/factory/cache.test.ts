import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { storeOf } from "../../app/store.mock";
import { CacheFactory } from "./cache";

let factory: CacheFactory;

beforeAll(async () => {
  const store = await storeOf([CacheFactory]);
  factory = store.get(CacheFactory.name);
});

afterAll(async () => {
  await factory.clear();
});

describe("CacheFactory", () => {
  it("should create cache", () => {
    const name = "test_1";
    const cache = factory.get<string, number[]>(name);
    cache.set("test", [1, 2, 3]);
    const value = cache.get("test");
    expect(value).toBeArrayOfSize(3);
    expect(value).toContain(1);
    expect(value).toContain(2);
    expect(value).toContain(3);
  });

  it("should update cache", () => {
    const name = "test_2";
    const cache = factory.get<number, string>(name);
    cache.set(1, "hello");
    expect(cache.get(1)).toBe("hello");

    cache.set(1, "hi");
    expect(cache.get(1)).toBe("hi");
  });

  it("should add encode array value", () => {
    const name = "test_3";
    const cache = factory.get<string, number[]>(name);
    cache.addCacheRow({
      name,
      chunk: 0,
      value: "i45WKkktLlHSiTbUMdIxjo2NBQA=",
    });
    const value = cache.get("test");
    expect(value).toBeArrayOfSize(3);
    expect(value).toContainAllValues([1, 2, 3]);
  });

  it("should add encode string value", () => {
    const name = "test_4";
    const cache = factory.get<number, string>(name);
    cache.addCacheRow({
      name,
      chunk: 0,
      value: "i4421FHKyFSKjQUA",
    });
    expect(cache.get(1)).toBe("hi");
  });

  it("should delete cache", () => {
    const name = "test_5";
    const cache = factory.get<number, string>(name);
    cache.set(1, "hello");
    cache.set(2, "hi");
    expect(cache.get(1)).toBe("hello");
    expect(cache.size).toBe(2);

    cache.delete(1);
    expect(cache.get(1)).toBeUndefined();
    expect(cache.get(2)).toBe("hi");
    expect(cache.size).toBe(1);
  });
});
