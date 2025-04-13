import {
  type ActionConfig,
  type ActionContext,
  type ActionContextId,
  type ActionRequest,
  type ClientActionConfig,
  type ServerActionConfig,
} from "@pan/types";
import { randomUUIDv7 } from "bun";
import { join, normalize } from "path";
import type { Endpoint } from "../../app/endpoint";
import { Injectable } from "../../app/store";
import { Auth } from "../auth/auth";
import { ConfigService } from "../config";
import { LibraryService } from "../library/library";
import { ActionRunner } from "./action-runner";

export class ActionService extends Injectable {
  private static GET_CONTEXT_PATH = "/api/action/context/:id";
  private auth!: Auth;
  private configService!: ConfigService;
  private libraryService!: LibraryService;
  private runner!: ActionRunner;
  private contextCache = new Map<string, ActionContext>();

  override async inject() {
    this.auth = this.store.get(Auth.name);
    this.configService = this.store.get(ConfigService.name);
    this.libraryService = this.store.get(LibraryService.name);
    this.runner = this.store.get(ActionRunner.name);
  }

  private getContext({ id }: ActionContextId) {
    const context = this.contextCache.get(id);
    this.auth.removeAllowedPath("GET", ActionService.GET_CONTEXT_PATH, id);
    this.contextCache.delete(id);
    return context;
  }

  private getAction(name: string) {
    const config = this.configService.getConfig({ key: "ACTION" }) as
      | ActionConfig
      | undefined;
    return (config?.actions || []).find((action) => action.name === name);
  }

  private async createContext(
    config: ClientActionConfig | ServerActionConfig,
    directory: string,
    selectedEntries: string[]
  ) {
    directory = normalize(directory);
    const context: ActionContext = {
      directory,
      selectedEntries: selectedEntries.map((entry) => join(directory, entry)),
    };
    return await this.libraryService.fillActionContext(context, config);
  }

  private async handleActionRequest({
    name,
    directory,
    selectedEntries,
  }: ActionRequest) {
    const config = this.getAction(name);
    if (!config) return;
    const context = await this.createContext(
      config,
      directory,
      selectedEntries
    );
    if (config.type === "CLIENT") {
      const created: ActionContextId = { id: randomUUIDv7() };
      this.auth.addAllowedPath(
        "GET",
        ActionService.GET_CONTEXT_PATH,
        created.id
      );
      this.contextCache.set(created.id, context);
      return created;
    }
    if (config.type === "SERVER") {
      this.runner.run({ config, context });
    }
  }

  override get endpoints(): Endpoint[] {
    return [
      {
        path: ActionService.GET_CONTEXT_PATH,
        handle: (body) => this.getContext(body),
      },
      {
        method: "POST",
        path: "/api/action",
        handle: (body) => this.handleActionRequest(body),
      },
    ];
  }
}
