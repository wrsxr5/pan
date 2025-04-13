import { SessionLogger, type Logger } from "../util/logger";
import type { Config } from "./config";
import { type Endpoint } from "./endpoint";

export class Injectable {
  private _logger: Logger | null = null;
  get name(): string {
    return this.constructor.name;
  }
  get endpoints(): Endpoint[] {
    return [];
  }
  protected get logger(): Logger {
    if (this._logger !== null) return this._logger;
    this._logger = this.store.sessionLogger.getLogger(this.constructor.name);
    return this._logger;
  }
  constructor(protected store: Store) {
    this.store.add(this);
  }
  async inject() {}
  async afterInjected() {}
}

export class Store {
  sessionLogger: SessionLogger;
  private logger;
  private items = new Map<string, Injectable>();
  endpoints: Endpoint[] = [
    {
      path: "/api/logs",
      handle: () => this.sessionLogger.logs,
    },
  ];

  constructor(
    public config: Config,
    sessionLogger?: SessionLogger
  ) {
    this.sessionLogger = sessionLogger || new SessionLogger(config.logLevel);
    this.logger = this.sessionLogger.getLogger(Store.name);
  }

  get<T extends Injectable>(name: string): T {
    const item = this.items.get(name);
    if (item === undefined) {
      throw new Error(`injectable not found ${name}`);
    }
    return item as T;
  }

  add(item: Injectable) {
    this.logger.debug("add injectable", item.name);
    this.items.set(item.name, item);
    this.endpoints = this.endpoints.concat(item.endpoints);
  }

  inject() {
    const promises = [];
    for (const item of this.items.values()) {
      promises.push(item.inject());
    }
    return Promise.all(promises);
  }

  afterInjected() {
    const promises = [];
    for (const item of this.items.values()) {
      promises.push(item.afterInjected());
    }
    return Promise.all(promises);
  }
}
