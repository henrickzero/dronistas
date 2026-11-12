import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DialogComponent } from './dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DialogComponent],
  template: '<router-outlet></router-outlet><app-dialog></app-dialog>'
})
export class AppComponent {}
