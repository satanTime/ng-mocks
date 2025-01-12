import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'app',
  standalone: false,
})
export class AppPipe implements PipeTransform {
  transform(): string {
    return this.constructor.name;
  }

  public appPipe() {}
}
