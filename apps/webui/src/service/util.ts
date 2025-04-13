import { finalize, Observable, shareReplay } from 'rxjs';

export function sharedRequest<T>(req: () => Observable<T>) {
  let pending: Observable<T> | null = null;
  return () => {
    if (pending === null) {
      pending = req().pipe(
        shareReplay(1),
        finalize(() => (pending = null)),
      );
    }
    return pending;
  };
}
