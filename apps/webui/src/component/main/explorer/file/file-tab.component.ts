import { AnimationEvent } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  signal,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  escapeRegExp,
  type Entry,
  type FileSort,
  type Library,
  type LibraryTitle,
} from '@pan/types';
import { filter, forkJoin, Subscription, switchMap, tap } from 'rxjs';
import {
  enterLeaveAnimation,
  fadeAnimation,
} from 'src/animation/fade.animation';
import { EventService } from 'src/service/event.service';
import {
  EXPLORER_CONFIG_CHANGED_EVENT,
  ExplorerService,
  REFRESH_CURRENT_TAB_EVENT,
} from 'src/service/explorer.service';
import { LibraryService } from 'src/service/library.service';
import { SelectionService } from 'src/service/selection.service';
import { ToastService } from 'src/service/toast.service';
import { AnimePanelComponent } from './anime-panel.component';
import { BreadcrumbsComponent, PathItem } from './breadcrumbs.component';
import { EntryItem, FileListComponent } from './file-list.component';

function getExtension(entry: Entry) {
  if (entry.isDirectory) return '';
  const match = entry.name.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function getType(extension: string) {
  if (extension.length === 0) return 'directory';
  if (['mp3', 'flac'].includes(extension)) return 'audio';
  if (['mp4', 'mkv', 'webm'].includes(extension)) return 'video';
  if (['jpg', 'png', 'webp'].includes(extension)) return 'image';
  if (['txt'].includes(extension)) return 'text';
  return 'others';
}

@Component({
  selector: 'app-file-tab',
  templateUrl: './file-tab.component.html',
  imports: [BreadcrumbsComponent, FileListComponent, AnimePanelComponent],
  animations: [fadeAnimation, enterLeaveAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileTabComponent implements OnDestroy {
  private readonly HIDDEN_ANIMATION_DONE = 'FILES_HIDDEN';
  library = signal<Library | null>(null);
  filter = '';
  sort: FileSort = 'NAME';
  rawBreadcrumbs: PathItem[] = [];
  breadcrumbs = signal<PathItem[]>([]);
  rawEntries: EntryItem[] = [];
  entries = signal<EntryItem[]>([]);
  title = signal<LibraryTitle | null>(null);
  isLoading = signal(false);
  subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private refreshConfig() {
    return this.explorerService.fileTabConfig.pipe(
      tap((config) => {
        this.filter = config.filter;
        this.sort = config.sort;
      }),
    );
  }

  private getLibraryIndex() {
    if (!this.route.parent) return 0;
    return Number(this.route.parent.snapshot.paramMap.get('index'));
  }

  private getPathItems() {
    const path = this.route.snapshot.queryParamMap.get('path');
    if (!path) return [];
    const segments = path.replace(/\\/g, '/').split('/');
    const items: PathItem[] = [];
    let currentPath = '';
    for (const segment of segments) {
      if (segment.length > 0) {
        currentPath += '/' + segment;
        items.push({
          label: segment,
          path: currentPath,
        });
      }
    }
    return items;
  }

  private onNavigationEnd() {
    return forkJoin([
      this.libraryService.getDetail(this.getLibraryIndex()),
      this.refreshConfig(),
    ]).pipe(
      tap(([detail]) => {
        if (!detail) return;
        this.library.set(detail.library);
        this.rawBreadcrumbs = [
          { label: detail.library.label, path: detail.library.path },
        ].concat(this.getPathItems());
        this.explore();
      }),
    );
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private eventService: EventService,
    private explorerService: ExplorerService,
    private libraryService: LibraryService,
    private selectionService: SelectionService,
    private toastService: ToastService,
  ) {
    this.onNavigationEnd().subscribe();
    this.subscriptions.push(
      this.router.events
        .pipe(
          filter((event) => event instanceof NavigationEnd),
          switchMap(() => this.onNavigationEnd()),
        )
        .subscribe(),
    );
    this.subscriptions.push(
      this.eventService
        .on(EXPLORER_CONFIG_CHANGED_EVENT)
        .pipe(
          switchMap(() => this.refreshConfig()),
          tap(() => this.applyConfig()),
        )
        .subscribe(),
    );
    this.subscriptions.push(
      this.eventService
        .on(REFRESH_CURRENT_TAB_EVENT)
        .pipe(switchMap(() => this.onNavigationEnd()))
        .subscribe(),
    );
  }

  private applyConfig() {
    const filter = this.filter;
    const sort = this.sort;
    let pattern: RegExp | null = null;
    if (filter.length > 0) {
      pattern = new RegExp(escapeRegExp(filter), 'i');
    }
    const entries = this.rawEntries
      .filter((entry) => {
        if (pattern !== null) {
          return pattern.test(entry.name) || pattern.test(entry.type);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        if (sort === 'NAME_R') {
          return b.name.localeCompare(a.name);
        }
        return a.name.localeCompare(b.name);
      });
    this.entries.set(entries);
    this.breadcrumbs.set(this.rawBreadcrumbs);
  }

  private asEntryItem(entry: Entry): EntryItem {
    const extension = getExtension(entry);
    return {
      ...entry,
      type: getType(extension),
      extension,
    };
  }

  private get currentDirectory() {
    const items = this.rawBreadcrumbs;
    if (items.length === 1) return items[0].path;
    return items[0].path + items[items.length - 1].path;
  }

  explore() {
    if (this.isLoading() || this.rawBreadcrumbs.length === 0) return;
    this.isLoading.set(true);
    const path = this.currentDirectory;
    this.selectionService.directory = path;
    forkJoin([
      this.libraryService.getTitle(path),
      this.explorerService.explore(path),
      this.eventService.once(this.HIDDEN_ANIMATION_DONE),
    ]).subscribe({
      next: ([title, entries]) => {
        this.rawEntries = entries.map(this.asEntryItem);
        this.applyConfig();
        this.title.set(title);
        this.isLoading.set(false);
        this.selectionService.selected = [];
      },
      error: (err) => {
        console.error(err);
        this.toastService.emit('warning', 'Redirect to home page');
        this.router.navigate(['']);
      },
    });
  }

  onAnimationEnd(event: AnimationEvent) {
    if (event.toState === 'hidden') {
      this.eventService.emit(this.HIDDEN_ANIMATION_DONE);
    }
  }

  enter(entry: Entry) {
    if (this.isLoading() || !entry.isDirectory) return;
    const items = this.rawBreadcrumbs;
    const root = items.length === 1 ? '' : items[items.length - 1].path;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { path: root + '/' + entry.name },
    });
  }

  onClickPathItem(index: number) {
    if (index === this.rawBreadcrumbs.length - 1) {
      this.eventService.emit(REFRESH_CURRENT_TAB_EVENT);
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { path: index === 0 ? '' : this.rawBreadcrumbs[index].path },
    });
  }
}
