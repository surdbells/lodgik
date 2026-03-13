import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FaqItem { q: string; a: string; }

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  openIndex = signal<number | null>(null);

  toggle(i: number): void {
    this.openIndex.update(v => v === i ? null : i);
  }

  isOpen(i: number): boolean { return this.openIndex() === i; }

  faqs: FaqItem[] = [
    {
      q: `Do I need to install software on my computers?`,
      a: `The main hotel PMS is fully browser-based — just open hotel.lodgik.co. We also offer
an optional Windows, macOS, and Linux desktop app for staff who prefer a native experience.
Staff mobile apps are APK files installed directly on Android devices — no Google Play required.`
    },
    {
      q: `How does guest payment work? Is Paystack used for guests?`,
      a: `Guest payments are manual — cash, bank transfer, or POS card machine — which is how the
vast majority of Nigerian hotels operate. Your hotel bank account details are displayed on every
invoice and in the guest portal. Paystack is used only for your Lodgik subscription billing.`
    },
    {
      q: `Can guests use the portal without downloading an app?`,
      a: `Yes. The guest portal (guest.lodgik.app) is a Progressive Web App — it works in any mobile
browser with no installation. Guests launch it by scanning a QR code, tapping an NFC card, or
clicking the link in their check-in WhatsApp/SMS. They can also add it to their home screen
exactly like a native app.`
    },
    {
      q: `What does "multi-property" mean? Can I manage multiple hotels?`,
      a: `On Business and Enterprise plans, a single Lodgik account can manage multiple properties.
Each property has its own rooms, staff, bookings, and financials. Aggregated reports show
performance across all your hotels in one dashboard.`
    },
    {
      q: `How is Lodgik different from other hotel software?`,
      a: `Lodgik is built specifically for how African hotels work — manual bank transfer payments,
cash-heavy operations, NFC guest cards, Nigeria PAYE payroll, and Naira billing. Most
international PMS products assume card-on-file integrations that do not exist in this market.
We built the software Nigerian hoteliers actually asked for.`
    },
    {
      q: `How secure is my hotel data?`,
      a: `Your data is isolated per-property and per-tenant — no cross-contamination. All connections
are TLS 1.3 encrypted. JWT authentication with short-lived tokens. Role-based access controls
ensure every staff member sees only what they need. Full audit log of every write operation.
Daily automated backups with 30-day retention.`
    },
  ];
}
