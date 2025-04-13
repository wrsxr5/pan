import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type {
  Library,
  LibraryDetail,
  LibraryTitle,
  OverMatched,
  ScanningConfig,
  ScanningStatus,
} from '@pan/types';
import { interval, map, of, switchMap, takeWhile, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { EventService } from './event.service';
import { sharedRequest } from './util';

export const LIBRARY_CHANGED_EVENT = 'LIBRARY_CHANGED';
export const SCAN_FINISHED_EVENT = 'SCAN_FINISHED';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private libraries: LibraryDetail[] | null = null;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  search(query: string) {
    return this.http.post<LibraryTitle[]>('/api/library/search', { query });
  }

  private getLibraryDetails = sharedRequest(() =>
    this.http
      .get<LibraryDetail[]>('/api/library/details')
      .pipe(tap((libraries) => (this.libraries = libraries))),
  );

  setLibraries(libraries: Library[]) {
    return this.configService
      .setConfig({
        key: 'LIBRARY',
        config: { libraries },
      })
      .pipe(
        tap(() => this.refreshTitles()),
        switchMap(() => this.getLibraryDetails()),
        tap(() => this.eventService.emit(LIBRARY_CHANGED_EVENT)),
      );
  }

  getDetail(index: number) {
    return this.getDetails().pipe(map((libraries) => libraries[index]));
  }

  getDetails() {
    if (this.libraries === null) {
      return this.getLibraryDetails();
    }
    return of(this.libraries);
  }

  getTitle(path: string) {
    return this.http.post<LibraryTitle | null>('/api/library/title', { path });
  }

  getTitles(path: string) {
    return this.http.post<LibraryTitle[]>('/api/library/titles', { path });
  }

  random() {
    return this.http.get<LibraryTitle | null>('/api/library/titles/random');
  }

  getOverMatchedTitles(path: string) {
    return this.http.post<OverMatched[]>('/api/library/titles/overmatched', {
      path,
    });
  }

  refreshTitles() {
    return this.http.get<void>('/api/library/titles/refresh');
  }

  scan(path: string) {
    return this.http.post<void>('/api/library/scan', { path });
  }

  setScanningConfig(config: ScanningConfig) {
    return this.http.post<void>('/api/library/scanning/config', config);
  }

  private checkScanningStatus(path: string) {
    return this.http.post<ScanningStatus>('/api/library/scanning/status', {
      path,
    });
  }

  onScanFinished(path: string) {
    interval(233)
      .pipe(
        switchMap(() => this.checkScanningStatus(path)),
        switchMap(({ status }) => {
          if (status === 'SCANNING') {
            return of(status);
          }
          return this.getLibraryDetails().pipe(
            tap(() => this.eventService.emit(LIBRARY_CHANGED_EVENT)),
            tap(() => this.eventService.emit(SCAN_FINISHED_EVENT)),
            map(() => status),
          );
        }),
        takeWhile((status) => status === 'SCANNING'),
      )
      .subscribe();
    return this.eventService.once(SCAN_FINISHED_EVENT);
  }
}
