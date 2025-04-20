import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { Entry } from '@pan/types';
import { Subscription } from 'rxjs';
import { FileSizePipe } from 'src/pipe/file-size.pipe';
import { ActionService } from 'src/service/action.service';
import { SelectionService } from 'src/service/selection.service';

export interface EntryItem {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
  type: 'directory' | 'audio' | 'video' | 'image' | 'text' | 'others';
  extension: string;
}

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  imports: [DatePipe, FileSizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileListComponent implements OnDestroy {
  selected = output<Entry>();
  items = signal<EntryItem[]>([]);
  showSelection = signal(false);
  selection = signal<number[]>([]);
  private subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  @Input() set entries(value: EntryItem[]) {
    this.selection.set([]);
    this.items.set(value);
  }

  constructor(
    private actionService: ActionService,
    private selectionService: SelectionService,
  ) {
    this.subscriptions.push(
      this.selectionService.onToggleSelection().subscribe((v) => {
        this.showSelection.set(v);
        this.selection.set([]);
      }),
    );
  }

  onClick(index: number) {
    if (this.showSelection()) {
      this.selection.update((v) => {
        if (v.includes(index)) return v.filter((ind) => ind !== index);
        return [...v, index];
      });
      this.selectionService.selected = this.selection().map(
        (ind) => this.items()[ind].name,
      );
    } else {
      this.selection.set([index]);
      const entry = this.items()[index];
      if (entry.isDirectory) {
        this.selected.emit(entry);
      } else {
        this.selectionService.selected = [entry.name];
        this.actionService.run();
      }
    }
  }
}
