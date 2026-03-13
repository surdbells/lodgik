
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
    { num: '1', title: 'Register & Onboard', desc: 'Create your hotel account, walk through the 7-step onboarding wizard, and configure your rooms, staff, and bank account details.' },
    { num: '2', title: 'Add Your Team', desc: 'Invite staff by email. Each role gets exactly the permissions they need — front desk, housekeeping, security, F&B, HR, and management.' },
    { num: '3', title: 'Install Your Apps', desc: 'Download staff apps directly from your admin dashboard. No app store approvals. Programme NFC room cards from the reception tablet.' },
    { num: '4', title: 'Start Operating', desc: 'Take your first booking, check in your first guest, and watch the folio, housekeeping tasks, and guest portal spin up automatically.' },
  ];
}
