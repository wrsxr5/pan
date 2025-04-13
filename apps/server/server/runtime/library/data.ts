import type { AniDBInfo, ImageRequest, IndexEntry } from "@pan/types";
import { existsSync } from "fs";
import { join } from "path";
import type { Endpoint } from "../../app/endpoint";
import { Injectable } from "../../app/store";
import { rawResponse } from "../../util/util";
import { Auth } from "../auth/auth";

export const DATA_DIR = join(import.meta.dirname, "../../../data");

export class DataService extends Injectable {
  private static IMAGE_CONTENT_PATH = "/api/content/image/:aid";
  private infoCache = new Map<number, AniDBInfo>();
  private index = new Map<number, IndexEntry>();

  override async inject() {
    const auth = this.store.get<Auth>(Auth.name);
    auth.addContentPath("GET", DataService.IMAGE_CONTENT_PATH);
    await this.load();
  }

  async load() {
    const path = join(DATA_DIR, "index.csv");
    if (!existsSync(path)) {
      this.logger.warning("no bundle index");
      return;
    }
    this.infoCache.clear();
    this.index.clear();
    (await Bun.file(path).text()).split("\n").forEach((line) => {
      const [a, b, c, d, e, f] = line.split(",");
      this.index.set(Number(a), {
        info: { start: Number(b), end: Number(c) },
        cover: { start: Number(d), end: Number(e) },
        coverType: f,
      });
    });
  }

  private async loadBuffer(start: number, end: number) {
    const path = join(DATA_DIR, "pan.bundle");
    if (!existsSync(path)) {
      this.logger.warning("no bundle");
      return;
    }
    return await Bun.file(path).slice(start, end).arrayBuffer();
  }

  async getInfo(aid: number) {
    let info = this.infoCache.get(aid);
    if (info && info.image) return info;
    const entry = this.index.get(aid);
    if (entry) {
      const buffer = await this.loadBuffer(entry.info.start, entry.info.end);
      if (buffer) {
        info = JSON.parse(new TextDecoder().decode(buffer)) as AniDBInfo;
        this.infoCache.set(aid, info);
        return info;
      }
    }
    return {};
  }

  private async getImage(req: ImageRequest) {
    const aid = Number(req.aid);
    const entry = this.index.get(aid);
    if (entry) {
      const buffer = await this.loadBuffer(entry.cover.start, entry.cover.end);
      if (buffer) {
        return new Response(buffer, {
          headers: {
            "Content-Type": entry.coverType,
          },
        });
      }
    }
    return new Response("Not Found", { status: 404 });
  }

  override get endpoints(): Endpoint[] {
    return [
      {
        path: DataService.IMAGE_CONTENT_PATH,
        handle: (body) => this.getImage(body),
        as: rawResponse,
      },
    ];
  }
}
