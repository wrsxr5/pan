import type { Config, ConfigSetting, LibraryConfig } from "@pan/types";
import { normalize } from "path";
import type { Endpoint } from "../app/endpoint";
import { Injectable } from "../app/store";
import { CacheFactory, type LocalCache } from "./factory/cache";

export class ConfigService extends Injectable {
  private static CACHE_NAME = "CONF_C";
  private cache!: LocalCache<string, Config>;

  override async inject() {
    const cacheFactory: CacheFactory = this.store.get(CacheFactory.name);
    this.cache = cacheFactory.get(ConfigService.CACHE_NAME);
  }

  getConfig({ key }: { key: string }) {
    return this.cache.get(key);
  }

  private setLibraryConfig(config: LibraryConfig) {
    config = config as LibraryConfig;
    config.libraries.forEach((library) => {
      library.path = normalize(library.path);
    });
    this.cache.set("LIBRARY", config);
  }

  private setConfig({ key, config }: ConfigSetting) {
    if (key === "LIBRARY") {
      this.setLibraryConfig(config as LibraryConfig);
      return;
    }
    this.cache.set(key, config);
  }

  override get endpoints(): Endpoint[] {
    return [
      {
        path: "/api/config/:key",
        handle: (params) => this.getConfig(params),
      },
      {
        method: "POST",
        path: "/api/config",
        handle: (body) => this.setConfig(body),
      },
    ];
  }
}
