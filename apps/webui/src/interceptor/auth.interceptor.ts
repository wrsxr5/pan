import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LocalStorage } from 'src/service/local-storage.service';

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) {
  const authToken = inject(LocalStorage).getItem('token');
  if (authToken && authToken.length > 0) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        window.location.href = `/login?cb=${Date.now()}`;
        return EMPTY;
      }
      return throwError(() => error);
    }),
  );
}
