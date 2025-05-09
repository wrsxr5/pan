import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { afterNextRender } from '@angular/core';
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

export interface SortOption<T, S extends number | string> {
  by: keyof T | ((t: T) => S);
  fallback?: () => number;
}

function apply<T, S extends number | string>(by: keyof T | ((t: T) => S)) {
  return typeof by === 'function' ? by : (t: T) => t[by] as S;
}

export function sortWith<T, S extends number | string>(
  a: T,
  b: T,
  option: SortOption<T, S>,
) {
  const transform = apply(option.by);
  const ta = transform(a);
  const tb = transform(b);
  if (ta === tb) {
    return typeof option.fallback === 'function' ? option.fallback() : 0;
  }
  return typeof ta === 'number' && typeof tb === 'number'
    ? ta - tb
    : String(ta).localeCompare(String(tb));
}

// https://github.com/angular/components/pull/29777
export function patchScrollViewport(viewport: CdkVirtualScrollViewport) {
  viewport['_doChangeDetection'] = () => {
    if (viewport['_isDestroyed']) {
      return;
    }
    viewport['ngZone'].run(() => {
      viewport['_changeDetectorRef'].markForCheck();
      afterNextRender(
        () => {
          viewport['_contentWrapper'].nativeElement.style.transform =
            viewport['_renderedContentTransform'];
          viewport['_isChangeDetectionPending'] = false;
          const runAfterChangeDetection = viewport['_runAfterChangeDetection'];
          viewport['_runAfterChangeDetection'] = [];
          for (const fn of runAfterChangeDetection) {
            fn();
          }
        },
        { injector: viewport['_injector'] },
      );
    });
  };
}
