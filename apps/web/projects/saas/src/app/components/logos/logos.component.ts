
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logos.component.html',
  styleUrl: './logos.component.scss'
})
export class LogosComponent {
  hotels = [
    'Grand Palace Hotel', 'Royal Suites Abuja',
    'Harbour View Lagos', 'The Meridian Inn',
    'Oasis Resorts', 'Pinnacle Hotel Group'
  ];
}
