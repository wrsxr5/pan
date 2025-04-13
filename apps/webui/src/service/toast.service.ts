import { Injectable, OnDestroy } from '@angular/core';
import { type Toast, TOAST_TOPIC, type ToastStyle } from '@pan/types';
import { map, Subject, Subscription, tap } from 'rxjs';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class ToastService implements OnDestroy {
  private subject = new Subject<Toast>();
  private event = this.subject.asObservable();
  private subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.subject.complete();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  constructor(private socketService: SocketService) {
    this.subscriptions.push(
      this.socketService
        .on(TOAST_TOPIC)
        .pipe(
          map(({ data }) => JSON.parse(data) as Toast),
          tap((toast) => this.emit(toast.style, toast.message, toast.duration)),
        )
        .subscribe(),
    );
  }

  on() {
    return this.event;
  }

  emit(style: ToastStyle, message: string, duration = 2333) {
    this.subject.next({ style, message, duration });
  }
}
