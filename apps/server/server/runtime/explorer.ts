import type { Entry, Path } from "@pan/types";
import { existsSync, readdirSync } from "fs";
import { join, normalize } from "path";
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

    return readdirSync(path, { withFileTypes: true }).map((value) => {
      if (value.isDirectory()) {
        return {
          name: value.name,
          isDirectory: true,
        };
      }
      const file = Bun.file(join(path, value.name));
      return {
        name: value.name,
        isDirectory: false,
        size: file.size,
        lastModified: file.lastModified,
      };
    });
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
