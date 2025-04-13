import { beforeAll, describe, expect, it } from "bun:test";
import { storeOf } from "../../app/store.mock";
import { AnimeTitles } from "../anime-titles/anime-titles";
import { AnimeTitlesMatcher } from "../anime-titles/anime-titles.matcher";
import { Auth } from "../auth/auth";
import { CacheFactory } from "../factory/cache";
import { PoolFactory } from "../factory/pool";
import { WS } from "../ws/ws";
import { Scanner } from "./scanner";

let scanner: Scanner;

beforeAll(async () => {
  const store = await storeOf([
    Auth,
    AnimeTitles,
    AnimeTitlesMatcher,
    CacheFactory,
    PoolFactory,
    Scanner,
    WS,
  ]);
  scanner = store.get(Scanner.name);
});

describe("Scanner", () => {
  it("should have name", () => {
    expect(scanner.name).toBe(Scanner.name);
  });
});
