import {
  escapeRegExp,
  type ActionContext,
  type AnimeTitle,
  type ClientActionConfig,
  type LibraryConfig,
  type LibraryDetail,
  type LibraryInfo,
  type LibrarySearchQuery,
  type LibraryTitle,
  type OverMatched,
  type Path,
  type ScanningConfig,
  type ScanningStatus,
  type ServerActionConfig,
} from "@pan/types";
import { existsSync } from "fs";
import { normalize } from "path";
import type { Endpoint } from "../../app/endpoint";
import { Injectable } from "../../app/store";
import { AnimeTitles } from "../anime-titles/anime-titles";
import type { MatchedTitle } from "../anime-titles/anime-titles.matcher";
import { ConfigService } from "../config";
import { CacheFactory, LocalCache } from "../factory/cache";
import { Scanner } from "../scanner/scanner";
import { DataService } from "./data";

export class LibraryService extends Injectable {
  private static INFO_CACHE_NAME = "LIB_INFO_C";
  private animeTitles!: AnimeTitles;
  private cacheFactory!: CacheFactory;
  private configService!: ConfigService;
  private dataService!: DataService;
  private scanner!: Scanner;
  private infoCache!: LocalCache<string, LibraryInfo>;
  private titleCache!: LocalCache<string, MatchedTitle[]>;
  private scanning = new Map<string, boolean>();
  private titles: LibraryTitle[] = [];

  override async inject() {
    this.animeTitles = this.store.get(AnimeTitles.name);
    this.cacheFactory = this.store.get(CacheFactory.name);
    this.configService = this.store.get(ConfigService.name);
    this.dataService = this.store.get(DataService.name);
    this.scanner = this.store.get(Scanner.name);
    this.infoCache = this.cacheFactory.get(LibraryService.INFO_CACHE_NAME);
    this.titleCache = this.cacheFactory.get(Scanner.CACHE_NAME);
  }

  override async afterInjected() {
    await this.refreshTitles();
  }

  private async refreshTitles() {
    this.titles = [];
    const libraries = this.getLibraries();
    if (libraries.length === 0) return;
    for (let k of this.titleCache.keys) {
      if (!libraries.some((library) => k.startsWith(library.path))) continue;
      const v = this.titleCache.get(k);
      if (v !== undefined && v.length === 1) {
        const aid = v[0].aid;
        const title = this.animeTitles.titles.get(aid);
        if (title) {
          const info = await this.dataService.getInfo(aid);
          this.titles.push({ path: k, title, info });
        } else {
          this.logger.warning("title not found", aid);
        }
      }
    }
  }

  async fillActionContext(
    context: ActionContext,
    config: ClientActionConfig | ServerActionConfig
  ) {
    const library = this.getLibraries().find((library) =>
      context.directory.startsWith(library.path)
    );
    if (!library) return context;
    if (config.library === true) {
      context.library = library;
    }
    if (config.selectedTitle == true) {
      context.selectedTitle = this.getTitle({ path: context.directory });
    }
    if (config.libraryInfo == true) {
      context.libraryInfo = this.infoCache.get(library.path);
    }
    if (config.libraryTitles == true) {
      context.libraryTitles = this.getTitles({ path: library.path });
    }
    return context;
  }

  private search({ query }: LibrarySearchQuery) {
    const titles: LibraryTitle[] = [];
    const pattern = new RegExp(escapeRegExp(query), "i");
    for (let v of this.titles) {
      if (pattern.test(JSON.stringify([v.path, v.title]))) {
        titles.push(v);
        if (titles.length >= 13) {
          return titles;
        }
      }
    }
    return titles;
  }

  private random() {
    if (this.titles.length === 0) return;
    return this.titles[Math.floor(Math.random() * this.titles.length)];
  }

  private getLibraries() {
    const config = this.configService.getConfig({ key: "LIBRARY" }) as
      | LibraryConfig
      | undefined;
    return config?.libraries || [];
  }

  private getDetails(): LibraryDetail[] {
    return this.getLibraries().map((library) => ({
      library,
      info: this.infoCache.get(library.path),
    }));
  }

  private getTitle({ path }: Path) {
    path = normalize(path + "/");
    for (let title of this.titles) {
      if (path.startsWith(normalize(title.path + "/"))) {
        return title;
      }
    }
  }

  private async updateScanningConfig(
    { libraryPath, assigned, ignored }: ScanningConfig,
    info: LibraryInfo
  ) {
    info.assigned = {};
    info.ignored = {};
    assigned.forEach(({ path, aid }) => {
      const normalized = normalize(path);
      if (existsSync(normalized)) {
        info.assigned[normalized] = aid;
      }
    });
    ignored.forEach(({ path }) => {
      const normalized = normalize(path);
      if (existsSync(normalized)) {
        info.ignored[normalized] = true;
      }
    });
    this.infoCache.set(libraryPath, info);
    this.scan({ path: libraryPath });
  }

  private setScanningConfig({
    libraryPath,
    assigned,
    ignored,
  }: ScanningConfig) {
    libraryPath = normalize(libraryPath);
    const info = this.infoCache.get(libraryPath);
    if (!info) return;
    this.scanning.set(libraryPath, true);
    this.updateScanningConfig({ libraryPath, assigned, ignored }, info);
  }

  private getTitles({ path }: Path) {
    path = normalize(path);
    if (this.scanning.get(path) === true) return [];
    return this.titles.filter((title) => title.path.startsWith(path));
  }

  private async getOverMatchedTitles({ path }: Path) {
    path = normalize(path);
    if (this.scanning.get(path) === true) return [];
    const overMatched: OverMatched[] = [];
    for (let k of this.titleCache.keys) {
      if (!k.startsWith(path)) continue;
      const v = this.titleCache.get(k);
      if (v !== undefined && v.length > 1) {
        const titles: AnimeTitle[] = [];
        for (let matched of v) {
          const aid = matched.aid;
          const title = this.animeTitles.titles.get(aid);
          if (title) {
            titles.push(title);
          }
        }
        overMatched.push({ path: k, titles });
      }
    }
    return overMatched;
  }

  private scan({ path }: Path) {
    path = normalize(path);
    if (!existsSync(path)) return;
    this.scanning.set(path, true);
    this.scanner
      .scan(path, this.infoCache.get(path))
      .then((info) => {
        this.infoCache.set(path, info);
        return this.refreshTitles();
      })
      .then(() => this.scanning.set(path, false));
  }

  private checkScanningStatus({ path }: Path): ScanningStatus {
    path = normalize(path);
    if (this.scanning.get(path) === true) {
      return { status: "SCANNING" };
    }
    return { status: "FINISHED" };
  }

  override get endpoints(): Endpoint[] {
    return [
      {
        method: "POST",
        path: "/api/library/search",
        handle: (body) => this.search(body),
      },
      {
        path: "/api/library/details",
        handle: () => this.getDetails(),
      },
      {
        method: "POST",
        path: "/api/library/title",
        handle: (body) => this.getTitle(body),
      },
      {
        method: "POST",
        path: "/api/library/titles",
        handle: (body) => this.getTitles(body),
      },
      {
        path: "/api/library/titles/random",
        handle: () => this.random(),
      },
      {
        method: "POST",
        path: "/api/library/titles/overmatched",
        handle: (body) => this.getOverMatchedTitles(body),
      },
      {
        path: "/api/library/titles/refresh",
        handle: () => this.refreshTitles(),
      },
      {
        method: "POST",
        path: "/api/library/scan",
        handle: (body) => this.scan(body),
      },
      {
        method: "POST",
        path: "/api/library/scanning/config",
        handle: (body) => this.setScanningConfig(body),
      },
      {
        method: "POST",
        path: "/api/library/scanning/status",
        handle: (body) => this.checkScanningStatus(body),
      },
    ];
  }
}
