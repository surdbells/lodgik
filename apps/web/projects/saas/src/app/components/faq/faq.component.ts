import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({ selector:'app-faq', standalone:true, imports:[CommonModule], templateUrl:'./faq.component.html', styleUrl:'./faq.component.scss' })
export class FaqComponent {
  open = signal<number|null>(null);
  toggle(i:number):void { this.open.update(v => v===i ? null : i); }
  faqs = [
    { q:`Do I need to install software on my computers?`,
      a:`The main hotel PMS is fully browser-based. We also offer an optional Windows, macOS, and Linux desktop app. Staff mobile apps are APK files installed directly on Android devices — no Google Play required.` },
    { q:`How does guest payment work — is Paystack used?`,
      a:`Guest payments are manual: cash, bank transfer, or POS card. Your hotel bank account details appear on every invoice and in the guest portal. Paystack is used only for your Lodgik subscription billing.` },
    { q:`Can guests use the portal without downloading an app?`,
      a:`Yes. The guest portal is a Progressive Web App — it works in any mobile browser with no installation. Guests launch it via QR code, NFC tap, or WhatsApp link. They can add it to their home screen like a native app.` },
    { q:`How does VAT work on invoices?`,
      a:`By default, room prices are VAT-inclusive (most common in Nigeria). The invoice extracts and displays the VAT component without adding to the guest total. You can switch to VAT-exclusive per room type, or disable VAT entirely in hotel settings.` },
    { q:`What does multi-property mean?`,
      a:`On Business and Enterprise plans, one Lodgik account manages multiple properties. Each property has its own rooms, staff, bookings, and financials. Aggregated reports show performance across all hotels in one dashboard.` },
    { q:`How is Lodgik different from other hotel software?`,
      a:`Lodgik is built for how African hotels actually work — manual bank transfer payments, cash-heavy operations, NFC guest cards, Nigeria PAYE payroll, and Naira billing. Most international PMS products assume card-on-file integrations that do not exist in this market.` },
  ];
}
