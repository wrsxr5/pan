import { beforeAll, describe, expect, it } from "bun:test";
import { join } from "path";
import { DEFAULT_CONFIG } from "../../app/config";
import { storeOf } from "../../app/store.mock";
import { AnimeTitles } from "./anime-titles";
import { AnimeTitlesFuse } from "./anime-titles.matcher";

let animeTitles: AnimeTitles;

beforeAll(async () => {
  const store = await storeOf([AnimeTitles]);
  animeTitles = store.get(AnimeTitles.name);
  await animeTitles.load(join(import.meta.dirname, "anime-titles.dat.gz"));
});

describe("AnimeTitles", () => {
  it("should load", () => {
    expect(animeTitles.titles).toHaveLength(15924);
    const createdDate = animeTitles.createdDate;
    expect(createdDate).toBeDate();
    expect(createdDate?.toISOString()).toBe("2025-03-18T03:00:02.000Z");
  });

  it("should match", () => {
    const titles = Array.from(animeTitles.titles.values());
    const matcher = new AnimeTitlesFuse(titles, DEFAULT_CONFIG);
    expect(matcher.search("Rurouni Kenshin 2023")).toHaveLength(1);
    expect(matcher.search("Dark Gathering")).toHaveLength(1);
    expect(matcher.search("Honzuki no Gekokujou")).toHaveLength(5);
    expect(matcher.search("戦う司書 the book of bantorra")).toHaveLength(1);
    expect(matcher.search("ひとりぼっちの○○生活")).toHaveLength(1);
  });
});
