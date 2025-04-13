import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  Assigned,
  Ignored,
  LibraryDetail,
  OverMatched,
  ScanningConfig,
} from '@pan/types';
import { Subscription, tap } from 'rxjs';
import { LibraryService } from 'src/service/library.service';
import { ScanningConfigService } from 'src/service/scanning-config.service';

interface AddAssignedModel {
  path: string;
  aid?: number;
}

@Component({
  selector: 'app-scanning-config',
  templateUrl: './scanning-config.component.html',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanningConfigComponent implements OnDestroy {
  @Output() configChanged = new EventEmitter<string>();
  config: ScanningConfig = {
    libraryPath: '',
    assigned: [],
    ignored: [],
  };
  overMatched = signal<OverMatched[]>([]);
  assigned = signal<Assigned[]>([]);
  ignored = signal<Ignored[]>([]);
  tab = signal<'OVERMATCHED' | 'IGNORED' | 'ASSIGNED' | 'NONE'>('NONE');
  showAllMatched = signal('');
  assignModels: {
    [key: string]: number;
  } = {};
  addIgnoredPathModel = '';
  addAssignedModel: AddAssignedModel = {
    path: '',
    aid: undefined,
  };
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private libraryService: LibraryService,
    private scanningConfigService: ScanningConfigService,
  ) {
    this.subscriptions.push(
      this.scanningConfigService
        .on()
        .pipe(
          tap(({ detail, tab }) => {
            this.initConfig(detail);
            this.tab.set(tab);
            this.dialog().nativeElement.showModal();
          }),
        )
        .subscribe(),
    );
  }

  private initConfig(value: LibraryDetail) {
    const config: ScanningConfig = {
      libraryPath: value.library.path,
      assigned: [],
      ignored: [],
    };
    if (value.info) {
      if (value.info.overMatched > 0) {
        this.libraryService
          .getOverMatchedTitles(config.libraryPath)
          .subscribe((titles) => this.overMatched.set(titles));
      }
      const assigned = value.info.assigned;
      Object.keys(assigned).forEach((path) => {
        config.assigned.push({ path, aid: assigned[path] });
      });
      const ignored = value.info.ignored;
      Object.keys(ignored).forEach((path) => {
        if (ignored[path] === true) {
          config.ignored.push({ path });
        }
      });
      this.assigned.set(config.assigned);
      this.ignored.set(config.ignored);
    }
    this.config = config;
  }

  cancel() {
    this.tab.set('NONE');
  }

  submit() {
    this.tab.set('NONE');
    this.libraryService.setScanningConfig(this.config).subscribe(() => {
      this.configChanged.emit(this.config.libraryPath);
    });
  }

  addAssigned() {
    if (
      this.addAssignedModel.path.length > 0 &&
      this.addAssignedModel.aid !== undefined
    ) {
      this.assignModels[this.addAssignedModel.path] = this.addAssignedModel.aid;
      this.assign(this.addAssignedModel.path);
    }
  }

  assign(path: string) {
    const aid = this.assignModels[path];
    this.config.ignored = this.config.ignored.filter((v) => v.path !== path);
    const assigned = this.config.assigned.find((v) => v.path === path);
    if (assigned) {
      assigned.aid = aid;
    } else {
      this.config.assigned.push({ path, aid });
    }
    this.overMatched.update((titles) => titles.filter((t) => t.path !== path));
    this.assigned.set(this.config.assigned);
    this.ignored.set(this.config.ignored);
  }

  ignore(path: string) {
    this.config.assigned = this.config.assigned.filter((v) => v.path !== path);
    const ignored = this.config.ignored.find((v) => v.path === path);
    if (!ignored) {
      this.config.ignored.push({ path });
    }
    this.overMatched.update((titles) => titles.filter((t) => t.path !== path));
    this.assigned.set(this.config.assigned);
    this.ignored.set(this.config.ignored);
  }

  remove(path: string) {
    this.config.ignored = this.config.ignored.filter((v) => v.path !== path);
    this.ignored.set(this.config.ignored);
  }

  export() {
    const json = JSON.stringify(this.config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = 'scanningConfig.json';
    this.document.body.appendChild(a);
    a.click();
    this.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  import(event: Event) {
    if (!event.target) return;
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && e.target.result) {
        this.config = JSON.parse(e.target.result as string);
        this.assigned.set(this.config.assigned);
        this.ignored.set(this.config.ignored);
        target.value = '';
      }
    };
    reader.readAsText(target.files[0]);
  }
}
