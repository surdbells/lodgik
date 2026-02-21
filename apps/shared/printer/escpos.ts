/**
 * ESC/POS Command Builder for Thermal Printers
 * Compatible with 58mm and 80mm thermal printers.
 * Used by both NativeScript (Bluetooth) and Web (Web Bluetooth API).
 */
export class EscPosBuilder {
  private commands: number[] = [];

  // ─── Control Commands ───────────────────────────────────────
  init(): this { this.commands.push(0x1B, 0x40); return this; } // ESC @
  cut(): this { this.commands.push(0x1D, 0x56, 0x00); return this; } // GS V 0 (full cut)
  partialCut(): this { this.commands.push(0x1D, 0x56, 0x01); return this; }
  feed(lines: number = 1): this { for (let i = 0; i < lines; i++) this.commands.push(0x0A); return this; }
  
  // ─── Text Formatting ───────────────────────────────────────
  bold(on: boolean): this { this.commands.push(0x1B, 0x45, on ? 0x01 : 0x00); return this; }
  underline(on: boolean): this { this.commands.push(0x1B, 0x2D, on ? 0x01 : 0x00); return this; }
  doubleHeight(on: boolean): this { this.commands.push(0x1B, 0x21, on ? 0x10 : 0x00); return this; }
  doubleWidth(on: boolean): this { this.commands.push(0x1B, 0x21, on ? 0x20 : 0x00); return this; }
  
  // ─── Alignment ──────────────────────────────────────────────
  alignLeft(): this { this.commands.push(0x1B, 0x61, 0x00); return this; }
  alignCenter(): this { this.commands.push(0x1B, 0x61, 0x01); return this; }
  alignRight(): this { this.commands.push(0x1B, 0x61, 0x02); return this; }
  
  // ─── Text Output ────────────────────────────────────────────
  text(str: string): this {
    for (let i = 0; i < str.length; i++) { this.commands.push(str.charCodeAt(i)); }
    return this;
  }
  
  line(str: string): this { return this.text(str).feed(); }
  
  separator(char: string = '-', width: number = 32): this {
    return this.line(char.repeat(width));
  }
  
  twoColumn(left: string, right: string, width: number = 32): this {
    const space = width - left.length - right.length;
    return this.line(left + ' '.repeat(Math.max(1, space)) + right);
  }

  // ─── Build ──────────────────────────────────────────────────
  build(): Uint8Array { return new Uint8Array(this.commands); }
  
  buildBase64(): string {
    const bytes = this.build();
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }
}

// ─── Receipt Templates ───────────────────────────────────────
export function buildBookingReceipt(hotel: string, booking: any): Uint8Array {
  return new EscPosBuilder()
    .init()
    .alignCenter().bold(true).doubleHeight(true).line(hotel).doubleHeight(false).bold(false)
    .line('BOOKING CONFIRMATION')
    .separator('=')
    .alignLeft()
    .twoColumn('Ref:', booking.booking_ref || 'N/A')
    .twoColumn('Guest:', booking.guest_name || 'N/A')
    .twoColumn('Room:', booking.room_number || 'N/A')
    .twoColumn('Check-in:', booking.check_in || 'N/A')
    .twoColumn('Check-out:', booking.check_out || 'N/A')
    .twoColumn('Nights:', String(booking.nights || 1))
    .separator()
    .twoColumn('Rate:', formatAmount(booking.rate))
    .twoColumn('Total:', formatAmount(booking.total))
    .separator()
    .alignCenter().line('Thank you for choosing ' + hotel)
    .line(new Date().toLocaleString())
    .feed(3).cut()
    .build();
}

export function buildCheckInSlip(hotel: string, booking: any): Uint8Array {
  return new EscPosBuilder()
    .init()
    .alignCenter().bold(true).line(hotel).bold(false)
    .line('CHECK-IN SLIP')
    .separator()
    .alignLeft()
    .twoColumn('Guest:', booking.guest_name || 'N/A')
    .twoColumn('Room:', booking.room_number || 'N/A')
    .twoColumn('WiFi:', booking.wifi_code || 'Lobby WiFi')
    .twoColumn('Checkout:', booking.check_out || 'N/A')
    .separator()
    .alignCenter().line('Welcome! Enjoy your stay.')
    .line(new Date().toLocaleString())
    .feed(3).cut()
    .build();
}

export function buildFolioSummary(hotel: string, folio: any): Uint8Array {
  const builder = new EscPosBuilder()
    .init()
    .alignCenter().bold(true).line(hotel).bold(false)
    .line('FOLIO SUMMARY')
    .separator('=')
    .alignLeft()
    .twoColumn('Guest:', folio.guest_name || 'N/A')
    .twoColumn('Room:', folio.room_number || 'N/A')
    .twoColumn('Period:', `${folio.check_in || ''} - ${folio.check_out || ''}`)
    .separator();

  (folio.charges || []).forEach((c: any) => {
    builder.twoColumn(c.description || 'Charge', formatAmount(c.amount));
  });
  
  builder
    .separator()
    .bold(true).twoColumn('TOTAL:', formatAmount(folio.total)).bold(false)
    .twoColumn('PAID:', formatAmount(folio.paid))
    .twoColumn('BALANCE:', formatAmount(folio.balance))
    .separator()
    .alignCenter().line('Thank you!')
    .line(new Date().toLocaleString())
    .feed(3).cut();
  
  return builder.build();
}

function formatAmount(amount: any): string {
  const n = Number(amount || 0);
  return 'NGN ' + (n / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}
