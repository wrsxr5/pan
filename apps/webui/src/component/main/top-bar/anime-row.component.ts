import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  Output,
} from '@angular/core';
import type { LibraryTitle } from '@pan/types';

@Component({
  selector: 'app-anime-row',
  templateUrl: './anime-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimeRowComponent {
  @Output() selected = new EventEmitter<void>();
  anime = input.required<LibraryTitle>();
}
