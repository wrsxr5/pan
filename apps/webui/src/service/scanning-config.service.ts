import { Injectable } from '@angular/core';
import { LibraryDetail } from '@pan/types';
import { Subject } from 'rxjs';

export type DialogTab = 'OVERMATCHED' | 'IGNORED' | 'ASSIGNED';

interface DialogContext {
  detail: LibraryDetail;
  tab: DialogTab;
}

@Injectable({
  providedIn: 'root',
})
export class ScanningConfigService {
  private subject = new Subject<DialogContext>();
  private event = this.subject.asObservable();

  showDialog(detail: LibraryDetail, tab: DialogTab) {
    this.subject.next({ detail, tab });
  }

  on() {
    return this.event;
  }
}
