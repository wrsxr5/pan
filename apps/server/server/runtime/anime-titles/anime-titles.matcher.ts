import type { AnimeTitle } from "@pan/types";
import { Dirent } from "fs";
import type { FuseIndex } from "fuse.js";
import Fuse from "fuse.js";
import type { Config } from "../../app/config";
import { Injectable } from "../../app/store";
import { getLogger, type Logger } from "../../util/logger";
import { AnimeTitles } from "./anime-titles";
import {
  PRE_FILTER_REGEX,
  RESIDUE_REGEX,
  VIDEO_REGEX,
} from "./anime-titles.regex";

const KEYS_MAIN = ["main", "ja.main", "en.main"] as const;

const KEYS_SUB = [
  "en.synonyms",
  "ja.synonyms",
  "en.shortTitles",
  "ja.shortTitles",
] as const;

type Key = (typeof KEYS_MAIN | typeof KEYS_SUB)[number];

export interface MatchedTitle {
  aid: number;
  score?: number;
}

export class AnimeTitlesFuse {
  private logger: Logger;
  private indexes = new Map<Key, FuseIndex<AnimeTitle>>();
  private fuses: Fuse<AnimeTitle>[] = [];

  constructor(
    private titles: AnimeTitle[],
    config: Config,
    name = "ATM"
  ) {
    this.logger = getLogger(name, config.logLevel);
    this.add(KEYS_MAIN, 0.1);
    this.add(KEYS_MAIN, 0.3);
    this.add(KEYS_SUB, 0.1);
    this.add(KEYS_MAIN, 0.5);
    this.add(KEYS_SUB, 0.3);
    this.add(KEYS_MAIN, 0.7);
    this.add(KEYS_SUB, 0.5);
    this.logger.debug("initiated");
  }

  private add(keys: typeof KEYS_MAIN | typeof KEYS_SUB, threshold: number) {
    keys.forEach((key) => {
      let index = this.indexes.get(key);
      if (index === undefined) {
        index = Fuse.createIndex([key], this.titles);
        this.indexes.set(key, index);
      }
      this.fuses.push(
        new Fuse(
          this.titles,
          {
            threshold,
            includeScore: true,
            keys: [key],
          },
          index
        )
      );
    });
  }

  search(name: string): MatchedTitle[] {
    for (const fuse of this.fuses) {
      const matched = fuse.search(name);
      if (matched.length > 0 && matched.length < 31) {
        if (matched.length > 11) {
          this.logger.warning("over matched:", name, matched.length);
        }
        return matched.map((res) => {
          return {
            aid: res.item.aid,
            score: res.score,
          };
        });
      }
    }
    this.logger.warning("not found:", name);
    return [];
  }
}

export class AnimeTitlesMatcher extends Injectable {
  cache = new Map<string, MatchedTitle[]>();
  private animeTitles!: AnimeTitles;
  private fuse: AnimeTitlesFuse | null = null;

  override async inject() {
    this.animeTitles = this.store.get(AnimeTitles.name);
  }

  private createFuse() {
    const titles = Array.from(this.animeTitles.titles.values());
    return new AnimeTitlesFuse(titles, this.store.config);
  }

  hasVideoFile(entries: Dirent[]) {
    return entries.some(
      (entry) => entry.isFile() && VIDEO_REGEX.test(entry.name)
    );
  }

  preFilter(name: string) {
    let filtered = name;
    filtered = filtered.replaceAll(PRE_FILTER_REGEX, "");
    RESIDUE_REGEX.forEach((reg) => {
      filtered = filtered.replaceAll(reg, "");
    });
    return filtered.trim();
  }

  search(name: string) {
    const filteredName = this.preFilter(name);
    if (filteredName.length === 0) return [];
    let matched = this.cache.get(filteredName);
    if (matched === undefined) {
      if (this.fuse === null) {
        this.fuse = this.createFuse();
      }
      matched = this.fuse.search(filteredName);
      this.cache.set(filteredName, matched);
    }
    return matched;
  }
}
