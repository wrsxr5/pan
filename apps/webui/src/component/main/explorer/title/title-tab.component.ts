import { AnimationEvent } from '@angular/animations';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  escapeRegExp,
  labelOf,
  type Library,
  type LibraryTitle,
  type TitleSort,
} from '@pan/types';
import { filter, forkJoin, Subscription, switchMap, tap } from 'rxjs';
import { fadeAnimation } from 'src/animation/fade.animation';
import { EventService } from 'src/service/event.service';
import {
  EXPLORER_CONFIG_CHANGED_EVENT,
  ExplorerService,
  REFRESH_CURRENT_TAB_EVENT,
} from 'src/service/explorer.service';
import { LibraryService } from 'src/service/library.service';
import { patchScrollViewport, sortWith } from 'src/service/util';
import { AnimeCardComponent } from './anime-card.component';

function BY_LABEL(t: LibraryTitle) {
  return labelOf(t.title);
}

function BY_DATE(t: LibraryTitle) {
  return t.info.startDate || seasonToDate(t.info.season);
}

function debounce(fn: () => void, ms = 23) {
  let timer = 0;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms) as unknown as number;
  };
}

function seasonToDate(season?: string) {
  return (
    season
      ?.replace('spring', '04-01')
      .replace('summer', '07-01')
      .replace('autumn', '10-01')
      .replace('winter', '01-01')
      .split('/')
      .slice(-2)
      .join('-') || '0000-00-00'
  );
}

@Component({
  selector: 'app-title-tab',
  templateUrl: './title-tab.component.html',
  imports: [AnimeCardComponent, ScrollingModule],
  animations: [fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleTabComponent implements AfterViewInit, OnDestroy {
  private readonly HIDDEN_ANIMATION_DONE = 'TITLES_HIDDEN';
  library = signal<Library | null>(null);
  filter = '';
  sort: TitleSort = 'NAME';
  rawTitles: LibraryTitle[] = [];
  titles: LibraryTitle[] = [];
  rows = signal<LibraryTitle[][]>([]);
  isLoading = signal(false);
  subscriptions: Subscription[] = [];
  rowSize = signal(5);
  private resizeObserver: ResizeObserver | null = null;
  private container = viewChild.required<ElementRef>('container');
  private viewport = viewChild.required<CdkVirtualScrollViewport>('viewport');

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.resizeObserver?.disconnect();
  }

  ngAfterViewInit() {
    this.setRowSize();
    patchScrollViewport(this.viewport());
  }

  private setRowSize() {
    const width = this.container().nativeElement.offsetWidth;
    if (width > 0) {
      const rowSize = Math.max(1, Math.trunc(width / 300));
      if (this.rowSize() !== rowSize) {
        this.rowSize.set(rowSize);
        this.setRows();
      }
    }
  }

  private refreshConfig() {
    return this.explorerService.titleTabConfig.pipe(
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

  private onNavigationEnd() {
    return forkJoin([
      this.libraryService.getDetail(this.getLibraryIndex()),
      this.refreshConfig(),
    ]).pipe(
      tap(([detail]) => {
        if (!detail) return;
        this.rows.set([]);
        this.library.set(detail.library);
        this.load(detail.library.path);
      }),
    );
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private eventService: EventService,
    private explorerService: ExplorerService,
    private libraryService: LibraryService,
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
    const titles = this.rawTitles
      .filter((title) => {
        if (pattern !== null) {
          return pattern.test(JSON.stringify(title));
        }
        return true;
      })
      .sort((a, b) => {
        const fallback = () => sortWith(a, b, { by: BY_LABEL });
        switch (sort) {
          case 'NAME_R':
            return sortWith(b, a, { by: BY_LABEL });
          case 'AIRED':
            return sortWith(a, b, { by: BY_DATE, fallback });
          case 'AIRED_R':
            return sortWith(b, a, { by: BY_DATE, fallback });
          default:
            return fallback();
        }
      });
    this.titles = titles;
    this.setRows();
  }

  private setRows() {
    const size = this.rowSize();
    const rows: LibraryTitle[][] = [];
    for (let i = 0; i < this.titles.length; i += size) {
      rows.push(this.titles.slice(i, i + size));
    }
    this.rows.set(rows);
  }

  private setResizeObserver() {
    const debounced = debounce(() => {
      this.setRowSize();
      this.viewport().checkViewportSize();
      this.isLoading.set(false);
    });
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.isLoading()) {
        this.isLoading.set(true);
      }
      debounced();
    });
    this.resizeObserver.observe(this.container().nativeElement);
  }

  private load(path: string) {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.resizeObserver?.disconnect();
    forkJoin([
      this.libraryService.getTitles(path),
      this.eventService.once(this.HIDDEN_ANIMATION_DONE),
    ]).subscribe(([titles]) => {
      this.rawTitles = titles;
      this.applyConfig();
      this.isLoading.set(false);
      this.setResizeObserver();
    });
  }

  onAnimationEnd(event: AnimationEvent) {
    if (event.toState === 'hidden') {
      this.eventService.emit(this.HIDDEN_ANIMATION_DONE);
    }
  }
}
