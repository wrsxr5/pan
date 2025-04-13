import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type {
  ActionConfig,
  ActionContextId,
  ActionRequest,
  ClientActionConfig,
  ServerActionConfig,
} from '@pan/types';
import { map, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { EventService } from './event.service';
import { SelectionService } from './selection.service';

export type Action = ClientActionConfig | ServerActionConfig;

export const ACTION_CHANGED_EVENT = 'ACTION_CHANGED';

@Injectable({
  providedIn: 'root',
})
export class ActionService {
  private readonly CONFIG_KEY = 'ACTION';
  private defaultAction = '';
  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private eventService: EventService,
    private selectionService: SelectionService,
  ) {}

  getActions() {
    return this.configService.getConfig<ActionConfig>(this.CONFIG_KEY).pipe(
      map((config) =>
        (config?.actions || []).sort((a, b) => a.name.localeCompare(b.name)),
      ),
      tap(
        (actions) =>
          (this.defaultAction = actions.find((a) => a.isDefault)?.name || ''),
      ),
    );
  }

  setActions(actions: Action[]) {
    return this.configService
      .setConfig({
        key: this.CONFIG_KEY,
        config: { actions },
      })
      .pipe(tap(() => this.eventService.emit(ACTION_CHANGED_EVENT)));
  }

  run(name = this.defaultAction) {
    if (name.length === 0) return;
    this.handleActionRequest({
      name,
      directory: this.selectionService.directory,
      selectedEntries: this.selectionService.selected,
    }).subscribe((value) => {
      if (value && value.id) {
        const { protocol, hostname, port } = window.location;
        const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
        window.location.href = `panclient://${name}/${value.id}/${encodeURIComponent(baseUrl)}`;
      }
    });
  }

  private handleActionRequest(req: ActionRequest) {
    return this.http.post<ActionContextId | null>('/api/action', req);
  }
}
