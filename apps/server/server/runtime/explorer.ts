import type { Entry, Path } from "@pan/types";
import { existsSync, readdirSync } from "fs";
import { normalize } from "path";
import type { Endpoint } from "../app/endpoint";
import { Injectable } from "../app/store";

export class Explorer extends Injectable {
  private explore({ path }: Path): Entry[] {
    path = normalize(path);
    if (!existsSync(path)) {
      const message = "path not found";
      this.logger.error(message, path);
      throw new Error(message);
    }
    return readdirSync(path, { withFileTypes: true }).map((value) => ({
      name: value.name,
      isDirectory: value.isDirectory(),
    }));
  }

  override get endpoints(): Endpoint[] {
    return [
      {
        method: "POST",
        path: "/api/explore",
        handle: (body) => this.explore(body),
      },
    ];
  }
}
