import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'count',
})
export class CountPipe implements PipeTransform {
  transform(value: object | null | undefined): number {
    if (!value || typeof value !== 'object') return 0;
    return Object.keys(value).length;
  }
}
