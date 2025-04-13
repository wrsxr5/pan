import type { AnimeTitle } from "./anime-titles.interface";
import type { AniDBInfo } from "./data.interface";

export interface LibrarySearchQuery {
  query: string;
}

export interface Library {
  index: number;
  label: string;
  path: string;
}

export interface LibraryInfo {
  lastScanned: Date;
  matched: number;
  overMatched: number;
  assigned: {
    [key: string]: number;
  };
  ignored: {
    [key: string]: boolean;
  };
}

export interface LibraryDetail {
  library: Library;
  info?: LibraryInfo;
}

export interface LibraryConfig {
  libraries: Library[];
}

export interface LibraryTitle {
  path: string;
  title: AnimeTitle;
  info: AniDBInfo;
}

export interface ScanningStatus {
  status: "SCANNING" | "FINISHED";
}

export interface ImageRequest {
  aid: string;
}

export interface OverMatched {
  path: string;
  titles: AnimeTitle[];
}

export interface Assigned {
  path: string;
  aid: number;
}

export interface Ignored {
  path: string;
}

export interface ScanningConfig {
  libraryPath: string;
  assigned: Assigned[];
  ignored: Ignored[];
}

export interface Bookmark {
  path: string;
  label: string;
}

export interface BookmarkConfig {
  bookmarks: Bookmark[];
}
