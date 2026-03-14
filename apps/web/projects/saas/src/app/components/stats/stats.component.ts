
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent {
  items = [
    { n:'43', l:'Feature modules across all plans' },
    { n:'12', l:'Apps — web, mobile & desktop' },
    { n:'10', l:'Staff roles with RBAC controls' },
    { n:'14', l:'Day free trial, no card needed' },
  ];
}
