import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ToastService } from 'src/service/toast.service';

export interface PathItem {
  path: string;
  label: string;
}

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  @Input() items: PathItem[] = [];
  @Output() selected = new EventEmitter<number>();

  constructor(private toastService: ToastService) {}

  private async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const message = 'Failed to copy text';
      this.toastService.emit('error', message);
      console.error(message, err);
    }
  }

  private get currentDirectory() {
    const items = this.items;
    if (items.length === 1) return items[0].path;
    return items[0].path + items[items.length - 1].path;
  }

  onClick(index: number) {
    if (index === this.items.length - 1) {
      this.copy(this.currentDirectory);
    }
    this.selected.emit(index);
  }
}
