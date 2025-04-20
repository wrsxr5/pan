import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number, decimalPlaces = 2): string {
    if (isNaN(bytes) || bytes === 0) return '0 Bytes';

    const k = 1024;
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimalPlaces));

    return `${size} ${units[i]}`;
  }
}
