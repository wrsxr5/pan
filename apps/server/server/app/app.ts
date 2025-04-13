import type { RouterTypes } from "bun";
import { readdirSync } from "fs";
import { join } from "path";
import { Auth } from "../runtime/auth/auth";
import { WS } from "../runtime/ws/ws";
import { SessionLogger } from "../util/logger";
import type { Config } from "./config";
import { routeOf } from "./endpoint";
import { Store, type Injectable } from "./store";

interface Routes {
  [key: string]: RouterTypes.RouteHandlerObject<typeof key>;
}

const STATIC_DIR = join(import.meta.dirname, "../../webui/browser");
const INDEX_PATH = join(STATIC_DIR, "index.html");

export class App {
  private sessionLogger;
  private logger;
  private store;
  private routes: Routes = {};

  constructor(
    public config: Config,
    items: (typeof Injectable)[]
  ) {
    this.sessionLogger = new SessionLogger(config.logLevel);
    this.logger = this.sessionLogger.getLogger(App.name);
    this.store = new Store(config, this.sessionLogger);
    for (const item of items) {
      new item(this.store);
    }
  }

  private addStaticRoutes() {
    readdirSync(STATIC_DIR, { withFileTypes: true })
      .filter((v) => v.isFile())
      .forEach((v) => {
        const path = "/" + v.name;
        const staticFile = Bun.file(join(STATIC_DIR, v.name));
        this.routes[path] = { GET: () => new Response(staticFile) };
        this.logger.debug("add static file", path);
      });
  }

  private generateRoutes() {
    this.addStaticRoutes();
    const authInterceptor = this.store.get<Auth>(Auth.name).interceptor();
    this.store.endpoints.forEach((endpoint) => {
      if (!(endpoint.path in this.routes)) {
        this.routes[endpoint.path] = {};
      }
      const method = endpoint.method || "GET";
      if (method in this.routes[endpoint.path]) {
        this.logger.error("duplicate endpoint", method, endpoint.path);
      }
      this.routes[endpoint.path][method] = authInterceptor(
        routeOf(endpoint)
      ).handler;
      this.logger.debug("add endpoint", method, endpoint.path);
    });
  }

  private handleNotFound(req: Request) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      this.logger.error(req.method, url.pathname, 404);
      return new Response("Not Found", { status: 404 });
    }
    this.logger.warning(req.method, url.pathname, "fallback: index.html");
    return new Response(Bun.file(INDEX_PATH));
  }

  private serve() {
    const ws = this.store.get<WS>(WS.name);
    const server = Bun.serve({
      development: this.config.mode === "DEV",
      port: this.config.port,
      routes: this.routes,
      websocket: ws.handler,
      fetch: (req) => {
        return this.handleNotFound(req);
      },
    });
    ws.init(server);
  }

  async init() {
    await this.store.inject();
    await this.store.afterInjected();
    this.generateRoutes();
    this.serve();
    this.logger.info(
      "started\n" +
        `mode: ${this.config.mode}\n` +
        `port: ${this.config.port}\n` +
        `log level: ${this.config.logLevel}`
    );
  }
}
