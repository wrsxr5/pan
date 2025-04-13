export interface LocalAnimeTitle {
  main?: string;
  synonyms?: string[];
  shortTitles?: string[];
}

export interface AnimeTitle {
  aid: number;
  main?: string;
  ja?: LocalAnimeTitle;
  en?: LocalAnimeTitle;
}

export function labelOf(title: AnimeTitle) {
  return title.ja?.main || title.main || String(title.aid);
}

export function escapeRegExp(word: string) {
  return word.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
}
