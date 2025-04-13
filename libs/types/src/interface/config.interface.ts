import type { ActionConfig } from "./action.interface";
import type { FileTabConfig, TitleTabConfig } from "./explorer.interface";
import type { BookmarkConfig, LibraryConfig } from "./library.interface";

export const Themes = [
  { name: "auto", label: "Auto (follow browser)" },
  { name: "light", label: "Light" },
  { name: "dark", label: "Dark" },
  { name: "black", label: "Black" },
] as const;
export type Theme = (typeof Themes)[number]["name"];

export interface UIConfig {
  theme: Theme;
}

export type Config =
  | UIConfig
  | LibraryConfig
  | BookmarkConfig
  | TitleTabConfig
  | FileTabConfig
  | ActionConfig;

export interface ConfigSetting {
  key: string;
  config: Config;
}

export function defaultUIConfig(): UIConfig {
  return {
    theme: "auto",
  };
}
