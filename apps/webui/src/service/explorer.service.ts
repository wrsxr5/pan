import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  defaultFileTabConfig,
  defaultTitleTabConfig,
  Tabs,
  type Entry,
  type FileTabConfig,
  type TitleTabConfig,
} from '@pan/types';
import { map, of, switchMap, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { EventService } from './event.service';
import { sharedRequest } from './util';

export const EXPLORER_CONFIG_CHANGED_EVENT = 'EXPLORER_CONFIG_CHANGED';
export const REFRESH_CURRENT_TAB_EVENT = 'REFRESH_CURRENT_TAB';

interface TabConfig {
  TITLE: TitleTabConfig | null;
  FILE: FileTabConfig | null;
}

@Injectable({
  providedIn: 'root',
})
export class ExplorerService {
  private config: TabConfig = { TITLE: null, FILE: null };

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  private getTitleTabConfig = sharedRequest(() =>
    this.configService.getConfig<TitleTabConfig>(Tabs.TITLE.configKey).pipe(
      map((config) => config || defaultTitleTabConfig()),
      tap((config) => (this.config.TITLE = config)),
    ),
  );

  get titleTabConfig() {
    if (this.config.TITLE === null) {
      return this.getTitleTabConfig();
    }
    return of(this.config.TITLE);
  }

  setTitleTabConfig(config: TitleTabConfig) {
    return this.configService
      .setConfig({
        key: Tabs.TITLE.configKey,
        config,
      })
      .pipe(
        switchMap(() => this.getTitleTabConfig()),
        tap(() => this.eventService.emit(EXPLORER_CONFIG_CHANGED_EVENT)),
      );
  }

  private getFileTabConfig = sharedRequest(() =>
    this.configService.getConfig<FileTabConfig>(Tabs.FILE.configKey).pipe(
      map((config) => config || defaultFileTabConfig()),
      tap((config) => (this.config.FILE = config)),
    ),
  );

  get fileTabConfig() {
    if (this.config.FILE === null) {
      return this.getFileTabConfig();
    }
    return of(this.config.FILE);
  }

  setFileTabConfig(config: FileTabConfig) {
    return this.configService
      .setConfig({
        key: Tabs.FILE.configKey,
        config,
      })
      .pipe(
        switchMap(() => this.getFileTabConfig()),
        tap(() => this.eventService.emit(EXPLORER_CONFIG_CHANGED_EVENT)),
      );
  }

  explore(path: string) {
    return this.http.post<Entry[]>('/api/explore', { path });
  }
}
