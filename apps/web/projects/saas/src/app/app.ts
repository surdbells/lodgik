
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: [':host { display: block; }']
})
export class App implements OnInit {
  constructor(private theme: ThemeService) {}
  ngOnInit(): void { /* ThemeService effect auto-applies data-theme */ }
}
