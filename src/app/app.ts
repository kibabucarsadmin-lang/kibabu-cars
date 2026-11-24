import { Component } from '@angular/core';
import { Shell } from './layout/shell';

@Component({
  selector: 'app-root',
  imports: [Shell],
  template: `<kb-shell />`,
})
export class App {}
