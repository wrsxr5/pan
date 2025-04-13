import { Injectable } from '@angular/core';
import { filter, first, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private subject = new Subject<string>();
  private event = this.subject.asObservable();

  emit(value: string) {
    this.subject.next(value);
  }

  on(value: string) {
    return this.event.pipe(filter((v) => v === value));
  }

  once(value: string) {
    return this.event.pipe(first((v) => v === value));
  }
}
