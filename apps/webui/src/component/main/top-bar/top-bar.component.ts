import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { LibraryTitle } from '@pan/types';
import { enterLeaveAnimation } from 'src/animation/fade.animation';
import { ClickOutsideDirective } from 'src/directive/click-outside.directive';
import { LibraryService } from 'src/service/library.service';
import { AnimeRowComponent } from './anime-row.component';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  imports: [FormsModule, AnimeRowComponent, ClickOutsideDirective],
  animations: [enterLeaveAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  @Output() toggleSideNav = new EventEmitter<void>();
  @Output() enterTitle = new EventEmitter<LibraryTitle>();
  @Output() openHome = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  searchQuery = '';
  titles = signal<LibraryTitle[]>([]);
  isOpen = signal(false);

  constructor(private libraryService: LibraryService) {}

  onSearch() {
    if (this.searchQuery.length <= 2) {
      this.titles.set([]);
      return;
    }
    this.libraryService
      .search(this.searchQuery)
      .subscribe((titles) => this.titles.set(titles));
  }

  enter(title: LibraryTitle) {
    this.enterTitle.emit(title);
    this.searchQuery = '';
    this.titles.set([]);
  }

  onKeypress(event: KeyboardEvent) {
    const titles = this.titles();
    if (event.key === 'Enter' && titles.length === 1) {
      (event.target as HTMLInputElement).blur();
      this.enter(titles[0]);
    }
  }
}
