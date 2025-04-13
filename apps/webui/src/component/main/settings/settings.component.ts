import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  Themes,
  type Library,
  type LibraryDetail,
  type Theme,
} from '@pan/types';
import { tap } from 'rxjs';
import { CountPipe } from 'src/pipe/count.pipe';
import { ActionService, type Action } from 'src/service/action.service';
import { BookmarkService } from 'src/service/bookmark.service';
import { ConfigService } from 'src/service/config.service';
import { LibraryService } from 'src/service/library.service';
import {
  ScanningConfigService,
  type DialogTab,
} from 'src/service/scanning-config.service';
import { ActionModalComponent } from './action-modal.component';
import {
  LibraryModalComponent,
  LibraryModalResult,
} from './library-modal.component';
import { LogModalComponent } from './log-modal.component';
import { ScanningConfigComponent } from './scanning-config.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  imports: [
    CountPipe,
    DatePipe,
    ActionModalComponent,
    LibraryModalComponent,
    ScanningConfigComponent,
    LogModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  themes = Themes;
  theme = signal<Theme>('auto');
  autoTheme = signal<Theme>('auto');
  libraries = signal<LibraryDetail[]>([]);
  actions = signal<Action[]>([]);
  scanning = signal('');
  isRemovable = signal(false);

  constructor(
    private config: ConfigService,
    private actionService: ActionService,
    private libraryService: LibraryService,
    private bookmarkService: BookmarkService,
    private scanningConfigService: ScanningConfigService,
  ) {
    this.theme.set(config.getLocalUIConfig().theme);
    this.autoTheme.set(config.getBrowserTheme());
    this.refreshLibraries();
    this.refreshActions();
  }

  private refreshLibraries() {
    this.libraryService
      .getDetails()
      .subscribe((details) => this.libraries.set(details));
  }

  private refreshActions() {
    this.actionService
      .getActions()
      .subscribe((actions) => this.actions.set(actions));
  }

  setTheme(value: Theme) {
    this.config
      .setConfig({
        key: 'UI',
        config: {
          theme: value,
        },
      })
      .subscribe(() => {
        this.theme.set(value);
        this.config.applyUIConfig({ theme: value });
      });
  }

  private getLibraries() {
    return this.libraries().map((detail) => detail.library);
  }

  private setLibraries(libraries: Library[]) {
    this.libraryService
      .setLibraries(libraries)
      .pipe(tap(() => this.refreshLibraries()))
      .subscribe();
  }

  addLibrary(result: LibraryModalResult | null) {
    if (result) {
      const libraries = this.getLibraries();
      this.setLibraries([
        ...libraries,
        {
          index: libraries.length,
          label: result.label,
          path: result.path,
        },
      ]);
    }
  }

  swap(a: number, b: number) {
    const libraries = this.getLibraries();
    [libraries[a], libraries[b]] = [libraries[b], libraries[a]];
    libraries[a].index = a;
    libraries[b].index = b;
    this.setLibraries(libraries);
  }

  checkScanningStatus(path: string) {
    this.scanning.set(path);
    this.libraryService.onScanFinished(path).subscribe(() => {
      this.scanning.set('');
      this.refreshLibraries();
    });
  }

  scan(library: Library) {
    const path = library.path;
    this.libraryService.scan(path).subscribe();
    this.checkScanningStatus(path);
  }

  showScanningConfigDialog(detail: LibraryDetail, tab: DialogTab) {
    this.scanningConfigService.showDialog(detail, tab);
  }

  checkLibrary(path: string) {
    this.bookmarkService.get().subscribe((bookmarks) => {
      this.isRemovable.set(
        !bookmarks.some((bookmark) => bookmark.path.startsWith(path)),
      );
    });
  }

  removeLibrary(index: number) {
    const libraries = this.getLibraries()
      .filter((library) => library.index !== index)
      .map((library) => {
        if (library.index < index) return library;
        library.index -= 1;
        return library;
      });
    this.setLibraries(libraries);
  }

  addAction(result: Action | null) {
    if (result) {
      this.actionService
        .setActions([
          ...this.actions().filter((a) => a.name !== result.name),
          result,
        ])
        .subscribe(() => this.refreshActions());
    }
  }

  removeAction(name: string) {
    this.actionService
      .setActions(this.actions().filter((a) => a.name !== name))
      .subscribe(() => this.refreshActions());
  }

  setDefaultAction(name: string) {
    this.actionService
      .setActions(
        this.actions().map((a) => {
          a.isDefault = a.name === name;
          return a;
        }),
      )
      .subscribe(() => this.refreshActions());
  }
}
