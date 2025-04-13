import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  defaultUIConfig,
  type Config,
  type ConfigSetting,
  type Theme,
  type UIConfig,
} from '@pan/types';
import { firstValueFrom, Subject, tap } from 'rxjs';
import { LocalStorage } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private themeSubject = new Subject<Theme>();
  private themeEvent = this.themeSubject.asObservable();

  constructor(
    private http: HttpClient,
    private localStorage: LocalStorage,
  ) {}

  getConfig<T extends Config>(key: string) {
    return this.http.get<T | null>('/api/config/' + key);
  }

  setConfig(setting: ConfigSetting) {
    return this.http.post<void>('/api/config', setting);
  }

  private setLocalUIConfig(config: UIConfig) {
    this.localStorage.setItem('config', JSON.stringify(config));
  }

  loadUIConfig() {
    return firstValueFrom(
      this.getConfig<UIConfig>('UI').pipe(
        tap((config) => {
          config = config || defaultUIConfig();
          this.applyUIConfig(config);
        }),
      ),
    );
  }

  getLocalUIConfig(): UIConfig {
    const raw = this.localStorage.getItem('config');
    if (raw) {
      return JSON.parse(raw);
    }
    return defaultUIConfig();
  }

  applyUIConfig(config?: UIConfig) {
    if (!config) {
      config = this.getLocalUIConfig();
    } else {
      this.setLocalUIConfig(config);
    }
    this.applyTheme(config.theme);
  }

  getBrowserTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private applyTheme(theme: Theme) {
    if (theme === 'auto') {
      theme = this.getBrowserTheme();
    }
    this.themeSubject.next(theme);
  }

  onThemeChange() {
    return this.themeEvent;
  }
}
