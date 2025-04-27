import {
  animate,
  AnimationEvent,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import {
  Tabs,
  type Bookmark,
  type LibraryDetail,
  type LibraryTitle,
  type Toast,
} from '@pan/types';
import { filter, switchMap, tap, type Subscription } from 'rxjs';
import { enterLeaveAnimation } from 'src/animation/fade.animation';
import {
  BOOKMARK_CHANGED_EVENT,
  BOOKMARK_OPENED_EVENT,
  BookmarkService,
} from 'src/service/bookmark.service';
import { EventService } from 'src/service/event.service';
import {
  LIBRARY_CHANGED_EVENT,
  LibraryService,
} from 'src/service/library.service';
import { ToastService } from 'src/service/toast.service';
import { TopBarComponent } from './top-bar/top-bar.component';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  imports: [RouterModule, TopBarComponent],
  animations: [
    enterLeaveAnimation,
    trigger('sideNavAnimation', [
      state('visible', style({ width: '300px' })),
      state('hidden', style({ width: 0 })),
      transition(
        'visible => hidden',
        animate('233ms ease-out', style({ width: 0 })),
      ),
      transition(
        'hidden => visible',
        animate('233ms ease-in', style({ width: '300px' })),
      ),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent implements OnDestroy {
  sideNavOpen = signal(false);
  showSideNavContent = signal(false);
  libraries = signal<LibraryDetail[]>([]);
  hasTitle = signal(false);
  bookmarks = signal<Bookmark[]>([]);
  bookmark = signal<Bookmark | null>(null);
  index = signal(0);
  toast = signal<Toast | null>(null);
  private subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private onNavigationEnd() {
    const child = this.route.firstChild?.snapshot?.url;
    if (!child) return;
    this.refreshBookmarks().subscribe();
    this.refreshLibraries().subscribe((libraries) => {
      if (child[0].path === 'settings') {
        this.index.set(-1);
        return;
      }
      if (child[0].path === 'libraries' && libraries.length > 0) {
        this.index.set(Number(child[1].path));
        return;
      }
      this.router.navigate(['settings']);
    });
  }

  private refreshLibraries() {
    return this.libraryService.getDetails().pipe(
      tap((details) => {
        this.libraries.set(details);
        this.hasTitle.set(details.some(({ info }) => info && info.matched > 0));
      }),
    );
  }

  private refreshBookmarks() {
    return this.bookmarkService
      .get()
      .pipe(tap((bookmarks) => this.bookmarks.set(bookmarks)));
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private bookmarkService: BookmarkService,
    private libraryService: LibraryService,
    private eventService: EventService,
    private toastService: ToastService,
  ) {
    this.onNavigationEnd();
    this.subscriptions.push(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => this.onNavigationEnd()),
    );
    this.subscriptions.push(
      this.eventService
        .on(BOOKMARK_CHANGED_EVENT)
        .pipe(switchMap(() => this.refreshBookmarks()))
        .subscribe(),
    );
    this.subscriptions.push(
      this.eventService
        .on(LIBRARY_CHANGED_EVENT)
        .pipe(switchMap(() => this.refreshLibraries()))
        .subscribe(),
    );
    this.subscriptions.push(
      this.eventService
        .on(BOOKMARK_OPENED_EVENT)
        .pipe(tap(() => this.bookmark.set(this.bookmarkService.openedBookmark)))
        .subscribe(),
    );
    this.subscriptions.push(
      this.toastService
        .on()
        .pipe(
          tap((toast) => {
            this.toast.set(toast);
            if (toast.duration > 0) {
              setTimeout(() => this.toast.set(null), toast.duration);
            }
          }),
        )
        .subscribe(),
    );
  }

  toggleSideNav() {
    this.sideNavOpen.update((value) => !value);
  }

  goHome() {
    this.router.navigate(['']);
  }

  goToSettings() {
    if (this.index() !== -1) {
      this.router.navigate(['settings']);
    }
  }

  goToIndex(index: number) {
    if (this.index() !== index) {
      this.router.navigate(['libraries', index]);
    }
  }

  private getLibraryDetail(path: string) {
    return this.libraries().find((detail) =>
      path.startsWith(detail.library.path),
    );
  }

  goToTitle(title: LibraryTitle) {
    const library = this.getLibraryDetail(title.path)?.library;
    if (library) {
      const path = title.path.slice(library.path.length);
      this.router.navigate(['libraries', library.index, Tabs.FILE.route], {
        queryParams: { path },
      });
    }
  }

  goToBookmark(bookmark: Bookmark) {
    const library = this.getLibraryDetail(bookmark.path)?.library;
    if (library) {
      const path = bookmark.path.slice(library.path.length);
      this.router.navigate(['libraries', library.index, Tabs.FILE.route], {
        queryParams: { path },
      });
    }
  }

  goToRandomTitle() {
    this.libraryService.random().subscribe((title) => {
      if (title) {
        this.goToTitle(title);
      }
    });
  }

  onSideNavAnimationStart(event: AnimationEvent) {
    if (event.fromState === 'visible') {
      this.showSideNavContent.set(false);
    }
  }

  onSideNavAnimationEnd(event: AnimationEvent) {
    if (event.toState === 'visible') {
      this.showSideNavContent.set(true);
    }
  }
}
