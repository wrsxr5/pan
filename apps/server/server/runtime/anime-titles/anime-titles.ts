import type { AnimeTitle } from "@pan/types";
import { existsSync } from "fs";
import { join } from "path";
import { Injectable } from "../../app/store";
import { DATA_DIR } from "../library/data";

export class AnimeTitles extends Injectable {
  private static DATA_PATH = join(DATA_DIR, "anime-titles.dat.gz");
  private static PATTERN = /^(\d+)\|(\d+)\|([^|]+)\|(.+)$/;
  titles = new Map<number, AnimeTitle>();
  createdDate: Date | null = null;

  private parseCreatedDate(line?: string) {
    if (line !== undefined) {
      this.createdDate = new Date(line.substring(11) + " UTC");
    }
  }

  private parseLine(line: string, titles: Map<number, AnimeTitle>) {
    if (line.length === 0 || line[0] === "#") return;
    const match = line.match(AnimeTitles.PATTERN);
    if (!match) {
      this.logger.warning("unable to parse line:", line);
      return;
    }
    const aid = parseInt(match[1]);
    const type = parseInt(match[2]);
    let title = titles.get(aid);
    if (title === undefined) {
      title = {
        aid,
        ja: { synonyms: [], shortTitles: [] },
        en: { synonyms: [], shortTitles: [] },
      };
      titles.set(aid, title);
    }
    if (type === 1) {
      title.main = match[4];
      return;
    }
    if (type === 2) {
      if (match[3] === "ja") {
        title.ja?.synonyms?.push(match[4]);
      } else if (match[3] === "en") {
        title.en?.synonyms?.push(match[4]);
      }
    }
    if (type === 3) {
      if (match[3] === "ja") {
        title.ja?.shortTitles?.push(match[4]);
      } else if (match[3] === "en") {
        title.en?.shortTitles?.push(match[4]);
      }
    }
    if (type === 4) {
      if (match[3] === "ja") {
        title.ja!.main = match[4];
      } else if (match[3] === "en") {
        title.en!.main = match[4];
      }
    }
  }

  async load(dataPath = AnimeTitles.DATA_PATH, replace = true) {
    if (!existsSync(dataPath)) {
      this.logger.warning("no titles data");
      return;
    }
    const data = await Bun.file(dataPath).bytes();
    const lines = new TextDecoder().decode(Bun.gunzipSync(data)).split("\n");
    const firstLine = lines.shift();
    const titles = new Map<number, AnimeTitle>();
    lines.forEach((line) => this.parseLine(line, titles));
    this.logger.debug("titles loaded from", dataPath);
    if (replace === true) {
      this.parseCreatedDate(firstLine);
      this.titles = titles;
    }
    return titles;
  }

  override async inject() {
    await this.load();
  }
}
