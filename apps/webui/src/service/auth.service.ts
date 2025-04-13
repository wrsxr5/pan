import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import type { Token, Verification } from '@pan/types';
import { map, of, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { LocalStorage } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private http: HttpClient,
    private config: ConfigService,
    private localStorage: LocalStorage,
  ) {}

  login(name: string, password: string) {
    return this.http
      .post<Token>('/api/auth/login', {
        name,
        hash: password,
      })
      .pipe(
        tap(({ token }) => {
          if (token) {
            this.localStorage.setItem('token', token);
            this.document.cookie = `pan_webui=${token}; Path=/`;
            this.config.loadUIConfig();
          }
        }),
        map(({ token }) => token !== undefined),
      );
  }

  verify() {
    const token = this.localStorage.getItem('token');
    if (!token || token.length === 0) {
      return of(false);
    }
    return this.http.post<Verification>('/api/auth/verify', { token }).pipe(
      map(({ authorized }) => {
        if (!authorized) {
          this.localStorage.removeItem('token');
        }
        return authorized;
      }),
    );
  }
}
