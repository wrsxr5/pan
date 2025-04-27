import { Injectable } from '@angular/core';
import type { Bookmark, BookmarkConfig } from '@pan/types';
import { map, of, switchMap, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { EventService } from './event.service';
import { sharedRequest } from './util';

export const BOOKMARK_CHANGED_EVENT = 'BOOKMARK_CHANGED';
export const BOOKMARK_OPENED_EVENT = 'BOOKMARK_OPENED';

@Injectable({
  providedIn: 'root',
})
export class BookmarkService {
  private readonly CONFIG_KEY = 'BOOKMARK';
  private bookmarks: Bookmark[] | null = null;
  openedBookmark: Bookmark | null = null;

  constructor(
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  private getConfig = sharedRequest(() =>
    this.configService.getConfig<BookmarkConfig>(this.CONFIG_KEY).pipe(
      map((config) => config?.bookmarks || []),
      tap((bookmarks) => (this.bookmarks = bookmarks)),
    ),
  );

  get() {
    if (this.bookmarks === null) {
      return this.getConfig();
    }
    return of(this.bookmarks);
  }

  private setConfig() {
    if (this.bookmarks === null) return this.getConfig();
    return this.configService
      .setConfig({
        key: this.CONFIG_KEY,
        config: { bookmarks: this.bookmarks },
      })
      .pipe(
        switchMap(() => this.getConfig()),
        tap(() => this.eventService.emit(BOOKMARK_CHANGED_EVENT)),
      );
  }

  add(bookmark: Bookmark) {
    if (
      this.bookmarks === null ||
      this.bookmarks.some((v) => v.path === bookmark.path)
    ) {
      return;
    }
    this.bookmarks.push(bookmark);
    this.setConfig().subscribe();
  }

  remove(bookmark: Bookmark) {
    if (
      this.bookmarks === null ||
      !this.bookmarks.some((v) => v.path === bookmark.path)
    ) {
      return;
    }
    this.bookmarks = this.bookmarks.filter((v) => v.path !== bookmark.path);
    this.setConfig().subscribe();
  }

  setOpenedBookmark(bookmark: Bookmark | null) {
    this.openedBookmark = bookmark;
    this.eventService.emit(BOOKMARK_OPENED_EVENT);
  }
}
