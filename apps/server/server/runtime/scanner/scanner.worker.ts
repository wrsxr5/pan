import type { AnimeTitle } from "@pan/types";
import type { Config } from "../../app/config";
import { register } from "../../util/worker";
import { AnimeTitlesFuse } from "../anime-titles/anime-titles.matcher";

interface InitValue {
  titles: AnimeTitle[];
  config: Config;
  name: string;
}

interface SearchValue {
  name: string;
}

declare var self: Worker;

let fuse: AnimeTitlesFuse;

function init({ titles, config, name }: InitValue) {
  fuse = new AnimeTitlesFuse(titles, config, name);
}

function search({ name }: SearchValue) {
  return fuse.search(name);
}

register(self, {
  init,
  search,
});
