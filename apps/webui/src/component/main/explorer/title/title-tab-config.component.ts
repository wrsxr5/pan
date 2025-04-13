import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { defaultTitleTabConfig, Sorts, type TitleSort } from '@pan/types';
import { tap } from 'rxjs';
import { ExplorerService } from 'src/service/explorer.service';

@Component({
  selector: 'app-title-tab-config',
  templateUrl: './title-tab-config.component.html',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleTabConfigComponent {
  readonly sorts = Sorts.TITLE;
  filterModel = '';
  config = defaultTitleTabConfig();
  currentFilter = signal('');
  currentSort = signal<TitleSort>('NAME');

  private applyConfig() {
    this.currentFilter.set(this.config.filter);
    this.currentSort.set(this.config.sort);
  }

  constructor(private explorerService: ExplorerService) {
    this.explorerService.titleTabConfig.subscribe((config) => {
      this.config = config;
      this.applyConfig();
    });
  }

  private saveConfig() {
    this.explorerService
      .setTitleTabConfig(this.config)
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

  setSort(sort: TitleSort) {
    this.config.sort = sort;
    this.saveConfig();
  }

  onKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
      this.setFilter();
    }
  }
}
