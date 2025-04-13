import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { type Library, LibraryDetail, type Tab, Tabs } from '@pan/types';
import { filter, Subscription } from 'rxjs';
import { enterLeaveAnimation } from 'src/animation/fade.animation';
import { LibraryService } from 'src/service/library.service';
import { ActionComponent } from './action/action.component';
import { FileTabConfigComponent } from './file/file-tab-config.component';
import { TitleTabConfigComponent } from './title/title-tab-config.component';

function getTabByRoute(route?: string) {
  if (!route) return;
  const tab = Object.entries(Tabs).find(([, v]) => v.route === route);
  return tab ? (tab[0] as Tab) : undefined;
}

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  imports: [
    FormsModule,
    RouterModule,
    ActionComponent,
    TitleTabConfigComponent,
    FileTabConfigComponent,
  ],
  animations: [enterLeaveAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerComponent implements OnDestroy {
  library = signal<Library | null>(null);

  readonly allTabs = Tabs;
  tabs = signal<Tab[]>(['TITLE', 'FILE']);
  tab = signal<Tab>('TITLE');
  private subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private setLibrary(detail?: LibraryDetail) {
    if (!detail) return;
    const child = this.route.firstChild?.snapshot?.url[0]?.path;
    const tab = getTabByRoute(child);
    if (!tab) return;
    this.library.set(detail.library);
    this.tab.set(tab);
    if ((detail.info?.matched || 0) > 0) {
      this.tabs.set(['TITLE', 'FILE']);
      return;
    }
    this.tabs.set(['FILE']);
    if (tab !== 'FILE') {
      this.router.navigate([Tabs.FILE.route], { relativeTo: this.route });
    }
  }

  private onNavigationEnd() {
    const index = Number(this.route.snapshot.paramMap.get('index'));
    this.libraryService
      .getDetail(index)
      .subscribe((detail) => this.setLibrary(detail));
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private libraryService: LibraryService,
  ) {
    this.onNavigationEnd();
    this.subscriptions.push(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => this.onNavigationEnd()),
    );
  }

  goToTab(tab: Tab) {
    this.router.navigate([Tabs[tab].route], { relativeTo: this.route });
  }
}
