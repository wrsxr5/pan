import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { defaultFileTabConfig, type FileSort, Sorts } from '@pan/types';
import { tap } from 'rxjs';
import { ExplorerService } from 'src/service/explorer.service';
import { SelectionService } from 'src/service/selection.service';

@Component({
  selector: 'app-file-tab-config',
  templateUrl: './file-tab-config.component.html',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileTabConfigComponent {
  readonly sorts = Sorts.FILE;
  filterModel = '';
  config = defaultFileTabConfig();
  currentFilter = signal('');
  currentSort = signal<FileSort>('NAME');
  selection = signal(false);

  private applyConfig() {
    this.currentFilter.set(this.config.filter);
    this.currentSort.set(this.config.sort);
  }

  constructor(
    private explorerService: ExplorerService,
    private selectionService: SelectionService,
  ) {
    this.explorerService.fileTabConfig.subscribe((config) => {
      this.config = config;
      this.applyConfig();
    });
    this.selection.set(this.selectionService.enabled);
  }

  private saveConfig() {
    this.explorerService
      .setFileTabConfig(this.config)
      .pipe(tap(() => this.applyConfig()))
      .subscribe();
  }

  resetFilter() {
    this.filterModel = '';
    this.setFilter();
  }

  private setFilter() {
    this.config.filter = this.filterModel;
    this.filterModel = '';
    this.saveConfig();
  }

  setSort(sort: FileSort) {
    this.config.sort = sort;
    this.saveConfig();
  }

  onKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
      this.setFilter();
    }
  }

  setSelection() {
    this.selection.update((v) => !v);
    this.selectionService.toggleSelection(this.selection());
  }
}
