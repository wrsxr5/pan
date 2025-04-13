import type { LibraryInfo } from "@pan/types";
import { readdirSync } from "fs";
import { basename, join } from "path";
import { Injectable } from "../../app/store";
import type { Pool } from "../../util/worker";
import { AnimeTitles } from "../anime-titles/anime-titles";
import {
  AnimeTitlesMatcher,
  type MatchedTitle,
} from "../anime-titles/anime-titles.matcher";
import { CacheFactory, type LocalCache } from "../factory/cache";
import { PoolFactory } from "../factory/pool";
import { WS } from "../ws/ws";

const WORKER_PATH = join(import.meta.dirname, "scanner.worker.ts");

export class Scanner extends Injectable {
  private static POOL_NAME = "ATS_P";
  static CACHE_NAME = "TITLE_C";

  private animeTitles!: AnimeTitles;
  private poolFactory!: PoolFactory;
  private matcher!: AnimeTitlesMatcher;
  private ws!: WS;
  private cache!: LocalCache<string, MatchedTitle[]>;
  private pool: Pool | null = null;

  override async inject() {
    this.animeTitles = this.store.get(AnimeTitles.name);
    this.poolFactory = this.store.get(PoolFactory.name);
    this.matcher = this.store.get(AnimeTitlesMatcher.name);
    this.ws = this.store.get(WS.name);
    this.cache = this.store
      .get<CacheFactory>(CacheFactory.name)
      .get(Scanner.CACHE_NAME);
  }

  private createPool() {
    if (this.pool !== null) return;
    const titles = Array.from(this.animeTitles.titles.values());
    this.pool = this.poolFactory.create({
      name: Scanner.POOL_NAME,
      scriptPath: WORKER_PATH,
      init: { input: { key: "init", value: { titles } } },
    });
  }

  private deletePool() {
    if (this.pool === null) return;
    this.pool = null;
    this.poolFactory.delete(Scanner.POOL_NAME);
  }

  private async search(name: string) {
    return new Promise<MatchedTitle[]>((resolve) => {
      if (this.pool === null) {
        throw new Error("null pool");
      }
      this.pool.send({
        input: { key: "search", value: { name } },
        callback: (matched) => {
          resolve(matched);
        },
      });
    });
  }

  private matchDirWithInfo(
    dir: string,
    info: LibraryInfo
  ): MatchedTitle[] | undefined {
    if (info.ignored[dir] === true) {
      this.cache.delete(dir);
      this.logger.debug("ignored", dir);
      return [];
    }
    if (dir in info.assigned) {
      this.cache.delete(dir);
      this.logger.debug("assigned", dir, info.assigned[dir]);
      return [
        {
          aid: info.assigned[dir],
          score: 0,
        },
      ];
    }
    return undefined;
  }

  private async matchDir(dir: string) {
    const name = basename(dir);
    const filteredName = this.matcher.preFilter(name);
    let matched: MatchedTitle[] | undefined = [];
    if (filteredName.length > 0) {
      matched = this.matcher.cache.get(filteredName);
      if (matched === undefined) {
        matched = await this.search(filteredName);
        this.matcher.cache.set(filteredName, matched);
      }
    } else {
      this.logger.trace("skip", name);
    }
    return matched;
  }

  private async walk(
    dir: string,
    toDelete: Set<string>,
    info: LibraryInfo,
    depth = 7
  ) {
    toDelete.delete(dir);
    if (depth < 0) {
      info.ignored[dir] = true;
      return;
    }
    const entries = readdirSync(dir, { withFileTypes: true });
    if (this.matcher.hasVideoFile(entries)) {
      const matched =
        this.matchDirWithInfo(dir, info) ||
        this.cache.get(dir) ||
        (await this.matchDir(dir));
      this.cache.set(dir, matched);
      const message = `${basename(dir)} matched ${matched.length}`;
      this.logger.info(message);
      this.ws.toast("success", message);
      return;
    }
    this.cache.delete(dir);
    delete info.assigned[dir];
    delete info.ignored[dir];
    const promises = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        this.walk(join(dir, entry.name), toDelete, info, depth - 1)
      );
    await Promise.all(promises);
  }

  private initInfo(info?: LibraryInfo) {
    return (
      info || {
        lastScanned: new Date(),
        matched: 0,
        overMatched: 0,
        assigned: {},
        ignored: {},
      }
    );
  }

  async scan(path: string, info?: LibraryInfo, depth = 7) {
    info = this.initInfo(info);
    if (this.animeTitles.titles.size === 0) {
      this.logger.warning("no titles data");
      return info;
    }
    const toDelete = new Set<string>(
      this.cache.keys.filter((k) => k.startsWith(path))
    );
    this.createPool();
    await this.walk(path, toDelete, info, depth);
    this.deletePool();
    toDelete.forEach((k) => this.cache.delete(k));
    info.lastScanned = new Date();
    info.matched = 0;
    info.overMatched = 0;
    this.cache.keys
      .filter((k) => k.startsWith(path))
      .forEach((k) => {
        const size = this.cache.get(k)?.length || 0;
        if (size === 0) {
          info.ignored[k] = true;
        } else if (size === 1) {
          info.matched += 1;
        } else {
          info.overMatched += 1;
        }
      });
    return info;
  }
}
