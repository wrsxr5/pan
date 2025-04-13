import { App } from "../app/app";
import { parseConfig } from "../app/config";
import { ActionService } from "./action/action";
import { ActionRunner } from "./action/action-runner";
import { AnimeTitles } from "./anime-titles/anime-titles";
import { AnimeTitlesMatcher } from "./anime-titles/anime-titles.matcher";
import { Auth } from "./auth/auth";
import { ConfigService } from "./config";
import { Explorer } from "./explorer";
import { CacheFactory } from "./factory/cache";
import { MockedCacheFactory } from "./factory/cache.mock";
import { PoolFactory } from "./factory/pool";
import { DataService } from "./library/data";
import { LibraryService } from "./library/library";
import { Scanner } from "./scanner/scanner";
import { WS } from "./ws/ws";

export function isDBDefined() {
  return process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0;
}

export async function start() {
  const config = parseConfig();
  const app = new App(config, [
    ActionRunner,
    ActionService,
    AnimeTitles,
    AnimeTitlesMatcher,
    Auth,
    isDBDefined() ? CacheFactory : MockedCacheFactory,
    ConfigService,
    DataService,
    Explorer,
    LibraryService,
    PoolFactory,
    Scanner,
    WS,
  ]);
  await app.init();
}
