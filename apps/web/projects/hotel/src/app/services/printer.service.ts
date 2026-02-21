import { Injectable } from '@angular/core';

// ─── Inline ESC/POS Builder (avoid cross-project import) ──────
class EscPosBuilder {
  private commands: number[] = [];
  init(): this { this.commands.push(0x1B, 0x40); return this; }
  cut(): this { this.commands.push(0x1D, 0x56, 0x00); return this; }
  feed(lines: number = 1): this { for (let i = 0; i < lines; i++) this.commands.push(0x0A); return this; }
  bold(on: boolean): this { this.commands.push(0x1B, 0x45, on ? 0x01 : 0x00); return this; }
  doubleHeight(on: boolean): this { this.commands.push(0x1B, 0x21, on ? 0x10 : 0x00); return this; }
  alignLeft(): this { this.commands.push(0x1B, 0x61, 0x00); return this; }
  alignCenter(): this { this.commands.push(0x1B, 0x61, 0x01); return this; }
  text(str: string): this { for (let i = 0; i < str.length; i++) { this.commands.push(str.charCodeAt(i)); } return this; }
  line(str: string): this { return this.text(str).feed(); }
  separator(char: string = '-', width: number = 32): this { return this.line(char.repeat(width)); }
  twoColumn(left: string, right: string, width: number = 32): this {
    const space = width - left.length - right.length;
    return this.line(left + ' '.repeat(Math.max(1, space)) + right);
  }
  build(): Uint8Array { return new Uint8Array(this.commands); }
}

function formatAmount(amount: any): string {
  const n = Number(amount || 0);
  return 'NGN ' + (n / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

@Injectable({ providedIn: 'root' })
export class PrinterService {
  private device: any = null;
  private characteristic: any = null;
  private _connected = false;

  get isConnected(): boolean { return this._connected; }
  get deviceName(): string { return this.device?.name || 'Unknown'; }

  async connect(): Promise<boolean> {
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) { console.warn('[Printer] Web Bluetooth not supported'); return false; }
      this.device = await nav.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      this._connected = true;
      return true;
    } catch (e) { console.error('[Printer] Connection failed:', e); this._connected = false; return false; }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this._connected = false; this.device = null; this.characteristic = null;
  }

  private async sendData(data: Uint8Array): Promise<boolean> {
    if (!this.characteristic || !this._connected) return false;
    try {
      const CHUNK = 20;
      for (let i = 0; i < data.length; i += CHUNK) {
        await this.characteristic.writeValue(data.slice(i, i + CHUNK));
      }
      return true;
    } catch (e) { console.error('[Printer] Send failed:', e); return false; }
  }

  async printBookingReceipt(hotelName: string, booking: any): Promise<boolean> {
    const b = new EscPosBuilder().init()
      .alignCenter().bold(true).doubleHeight(true).line(hotelName).doubleHeight(false).bold(false)
      .line('BOOKING CONFIRMATION').separator('=').alignLeft()
      .twoColumn('Ref:', booking.booking_ref || 'N/A').twoColumn('Guest:', booking.guest_name || 'N/A')
      .twoColumn('Room:', booking.room_number || 'N/A').twoColumn('Check-in:', booking.check_in || 'N/A')
      .twoColumn('Check-out:', booking.check_out || 'N/A').separator()
      .twoColumn('Total:', formatAmount(booking.total)).separator()
      .alignCenter().line('Thank you!').line(new Date().toLocaleString()).feed(3).cut();
    return this.sendData(b.build());
  }

  async printCheckInSlip(hotelName: string, booking: any): Promise<boolean> {
    const b = new EscPosBuilder().init()
      .alignCenter().bold(true).line(hotelName).bold(false).line('CHECK-IN SLIP').separator().alignLeft()
      .twoColumn('Guest:', booking.guest_name || 'N/A').twoColumn('Room:', booking.room_number || 'N/A')
      .twoColumn('WiFi:', booking.wifi_code || 'Ask front desk').twoColumn('Checkout:', booking.check_out || 'N/A')
      .separator().alignCenter().line('Welcome!').feed(3).cut();
    return this.sendData(b.build());
  }

  async printFolioSummary(hotelName: string, folio: any): Promise<boolean> {
    const b = new EscPosBuilder().init()
      .alignCenter().bold(true).line(hotelName).bold(false).line('FOLIO SUMMARY').separator('=').alignLeft()
      .twoColumn('Guest:', folio.guest_name || 'N/A').twoColumn('Room:', folio.room_number || 'N/A').separator();
    (folio.charges || []).forEach((c: any) => b.twoColumn(c.description || 'Charge', formatAmount(c.amount)));
    b.separator().bold(true).twoColumn('TOTAL:', formatAmount(folio.total)).bold(false)
      .twoColumn('PAID:', formatAmount(folio.paid)).twoColumn('BALANCE:', formatAmount(folio.balance))
      .separator().alignCenter().line('Thank you!').feed(3).cut();
    return this.sendData(b.build());
  }
}
