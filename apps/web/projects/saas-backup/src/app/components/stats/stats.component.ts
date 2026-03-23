
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
    { num: '43', label: 'Feature modules across all plans' },
    { num: '12', label: 'Apps — web, mobile & desktop' },
    { num: '10', label: 'Staff roles with RBAC controls' },
    { num: '14', label: 'Day free trial, no card needed' },
  ];
}
