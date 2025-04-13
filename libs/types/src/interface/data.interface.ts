export interface Tag {
  name?: string;
  url?: string;
}

export interface Rating {
  value?: number;
  count?: number;
}

export interface AniDBInfo {
  image?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  season?: string;
  tags?: Tag[];
  officialWebsite?: string;
  wikiURLs?: string[];
  aggregateRating?: Rating;
  averageRating?: Rating;
}

export interface IndexedBuffer {
  start: number;
  end: number;
}

export interface IndexEntry {
  info: IndexedBuffer;
  cover: IndexedBuffer;
  coverType: string;
}
