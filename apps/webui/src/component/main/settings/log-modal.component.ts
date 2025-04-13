import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { escapeRegExp, LOG_TOPIC, type LogEntry } from '@pan/types';
import { map, Subscription, switchMap, tap } from 'rxjs';
import { LogService } from 'src/service/log.service';
import { SocketService } from 'src/service/socket.service';

@Component({
  selector: 'app-log-modal',
  templateUrl: './log-modal.component.html',
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogModalComponent implements OnDestroy {
  filter = '';
  logs = signal<LogEntry[]>([]);
  private rawLogs: LogEntry[] = [];
  private subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.close();
  }

  constructor(
    private logService: LogService,
    private socketService: SocketService,
  ) {}

  apply() {
    const filter = this.filter;
    let pattern: RegExp | null = null;
    if (filter.length > 0) {
      pattern = new RegExp(escapeRegExp(filter), 'i');
    }
    this.logs.set(
      this.rawLogs.filter(
        (entry) =>
          !pattern ||
          pattern.test(entry.source) ||
          pattern.test(entry.level) ||
          pattern.test(entry.message),
      ),
    );
  }

  open(dialog: HTMLDialogElement) {
    this.subscriptions.push(
      this.logService
        .get()
        .pipe(
          tap((logs) => {
            this.rawLogs = logs.reverse();
            this.logs.set(this.rawLogs);
            dialog.showModal();
          }),
          switchMap(() => this.logService.stream(true)),
          switchMap(() => this.socketService.on(LOG_TOPIC)),
          map(({ data }) => JSON.parse(data) as LogEntry),
          tap((entry) => {
            this.rawLogs.unshift(entry);
            this.apply();
          }),
        )
        .subscribe(),
    );
  }

  close() {
    this.filter = '';
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.logService.stream(false).subscribe();
  }
}
