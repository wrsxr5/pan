import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  signal,
} from '@angular/core';
import type { Bookmark, LibraryTitle } from '@pan/types';
import { Subscription } from 'rxjs';
import {
  BOOKMARK_CHANGED_EVENT,
  BookmarkService,
} from 'src/service/bookmark.service';
import { EventService } from 'src/service/event.service';
import { LibraryService } from 'src/service/library.service';

@Component({
  selector: 'app-anime-panel',
  templateUrl: './anime-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimePanelComponent implements OnDestroy {
  _anime: LibraryTitle | null = null;
  xLink = signal('');
  isBookmarked = signal(false);
  isRefetching = signal(false);
  subscription: Subscription;

  constructor(
    private bookmarkService: BookmarkService,
    private eventService: EventService,
    private libraryService: LibraryService,
  ) {
    this.subscription = this.eventService
      .on(BOOKMARK_CHANGED_EVENT)
      .subscribe(() => this.checkBookmark());
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  @Input() set anime(value: LibraryTitle | null) {
    this._anime = value;
    this.checkBookmark();
    this.xLink.set(this.getXLink(value?.info.officialWebsite) || '');
  }

  get anime() {
    return this._anime;
  }

  getXLink(officialWebsite?: string) {
    return officialWebsite
      ?.split(' ')
      .find((site) => site.includes('twitter.com') || site.includes('x.com'));
  }

  private getBookmark(anime: LibraryTitle): Bookmark {
    return {
      label:
        anime.title.ja?.main || anime.title.main || String(anime.title.aid),
      path: anime.path,
    };
  }

  addBookmark() {
    if (this.anime && !this.isBookmarked()) {
      this.bookmarkService.add(this.getBookmark(this.anime));
    }
  }

  removeBookmark() {
    if (this.anime && this.isBookmarked()) {
      this.bookmarkService.remove(this.getBookmark(this.anime));
    }
  }

  checkBookmark() {
    if (this.anime) {
      const path = this.anime.path;
      this.bookmarkService.get().subscribe((bookmarks) => {
        this.isBookmarked.set(bookmarks.some((v) => v.path === path));
      });
    } else {
      this.isBookmarked.set(false);
    }
  }
}
