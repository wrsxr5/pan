import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ACTION_CHANGED_EVENT,
  ActionService,
  type Action,
} from 'src/service/action.service';
import { EventService } from 'src/service/event.service';

@Component({
  selector: 'app-action',
  templateUrl: './action.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionComponent implements OnDestroy {
  actions = signal<Action[]>([]);
  subscriptions: Subscription[] = [];

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  constructor(
    private actionService: ActionService,
    private eventService: EventService,
  ) {
    this.refreshActions();
    this.subscriptions.push(
      this.eventService
        .on(ACTION_CHANGED_EVENT)
        .subscribe(() => this.refreshActions()),
    );
  }

  private refreshActions() {
    this.actionService
      .getActions()
      .subscribe((actions) => this.actions.set(actions));
  }

  run(action: Action) {
    this.actionService.run(action.name);
  }
}
