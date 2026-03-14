
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss'
})
export class TestimonialsComponent {
  testimonials = [
    {
      initials: 'AJ', stars: 5,
      quote: `We used to manage everything on WhatsApp and Excel. Lodgik replaced all of that.
Our reception staff check guests in three times faster, and we haven't lost a single
payment record since switching.`,
      name: 'Adewale Johnson', role: 'General Manager', hotel: 'Grand Palace Hotel — Lagos'
    },
    {
      initials: 'BK', stars: 5,
      quote: `The guest portal is something our guests genuinely love. They scan the QR on the
welcome card, see their room charge in real time, and request room service without
calling the front desk. It feels like a 5-star experience.`,
      name: 'Blessing Kalu', role: 'Operations Director', hotel: 'Royal Suites — Abuja'
    },
    {
      initials: 'CO', stars: 5,
      quote: `Payroll used to take three days every month. Now it takes two hours. The Nigeria PAYE
calculator handles everything automatically. I finally have time to manage my team
instead of counting allowances manually.`,
      name: 'Chukwuma Obi', role: 'HR Manager', hotel: 'Harbour View Hotel — Port Harcourt'
    },
  ];
}
