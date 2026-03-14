
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss'
})
export class HowItWorksComponent {
  steps = [
    { n:'01', title:'Register & Onboard', desc:'Create your account and walk through the 7-step wizard. Configure rooms, staff, and bank details.' },
    { n:'02', title:'Add Your Team', desc:'Invite staff by email. Each role gets exactly the permissions they need — front desk to housekeeping.' },
    { n:'03', title:'Install Your Apps', desc:'Download staff apps directly from your admin panel. Programme NFC room cards from the reception tablet.' },
    { n:'04', title:'Start Operating', desc:'Take your first booking, check in your first guest, and watch the folio and tasks spin up automatically.' },
  ];
}
