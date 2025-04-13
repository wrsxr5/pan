import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  directory = '';
  selected: string[] = [];
  enabled = false;
  private toggleSelectionSubject = new Subject<boolean>();
  private toggleSelectionEvent = this.toggleSelectionSubject.asObservable();

  toggleSelection(value: boolean) {
    this.selected = [];
    this.enabled = value;
    this.toggleSelectionSubject.next(value);
  }

  onToggleSelection() {
    return this.toggleSelectionEvent;
  }
}
