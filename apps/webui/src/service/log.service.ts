import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { type LogEntry } from '@pan/types';

@Injectable({
  providedIn: 'root',
})
export class LogService {
  constructor(private http: HttpClient) {}

  get() {
    return this.http.get<LogEntry[]>('/api/logs');
  }

  stream(enabled: boolean) {
    return this.http.post<void>('/api/stream/logs', { enabled });
  }
}
