export interface Path {
  path: string;
}

interface DirectoryEntry {
  name: string;
  isDirectory: true;
}

interface FileEntry {
  name: string;
  isDirectory: false;
  size: number;
  lastModified: number;
}

export type Entry = DirectoryEntry | FileEntry;

export const Tabs = {
  TITLE: {
    label: 'Titles',
    route: 'title-tab',
    configKey: 'TITLE_TAB',
  },
  FILE: {
    label: 'Files',
    route: 'file-tab',
    configKey: 'FILE_TAB',
  },
} as const;

export type Tab = keyof typeof Tabs;

export const Sorts = {
  TITLE: [
    {
      name: 'NAME',
      label: 'Sort by name (A-Z)',
    },
    {
      name: 'NAME_R',
      label: 'Sort by name (Z-A)',
    },
    {
      name: 'AIRED',
      label: 'Sort by aired date (old to new)',
    },
    {
      name: 'AIRED_R',
      label: 'Sort by aired date (new to old)',
    },
  ],

  FILE: [
    {
      name: 'NAME',
      label: 'Sort by name (A-Z)',
    },
    {
      name: 'NAME_R',
      label: 'Sort by name (Z-A)',
    },
    {
      name: 'LAST_MODIFIED',
      label: 'Sort by date (old to new)',
    },
    {
      name: 'LAST_MODIFIED_R',
      label: 'Sort by date (new to old)',
    },
    {
      name: 'SIZE',
      label: 'Sort by size (small to big)',
    },
    {
      name: 'SIZE_R',
      label: 'Sort by size (big to small)',
    },
  ],
} as const;

export type TitleSort = (typeof Sorts)['TITLE'][number]['name'];

export type FileSort = (typeof Sorts)['FILE'][number]['name'];

export interface TitleTabConfig {
  filter: string;
  sort: TitleSort;
}

export interface FileTabConfig {
  filter: string;
  sort: FileSort;
}

export function defaultTitleTabConfig(): TitleTabConfig {
  return { filter: '', sort: 'NAME' };
}

export function defaultFileTabConfig(): FileTabConfig {
  return { filter: '', sort: 'NAME' };
}
