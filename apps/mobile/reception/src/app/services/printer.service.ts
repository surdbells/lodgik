import { Injectable } from '@angular/core';

/**
 * NativeScript Bluetooth Thermal Printer Service
 * Uses @nativescript-community/ble plugin (install separately).
 * For type safety during build, we use dynamic imports.
 */
@Injectable({ providedIn: 'root' })
export class NativePrinterService {
  private peripheral: any = null;
  private _connected = false;
  private serviceUUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private characteristicUUID = '00002af1-0000-1000-8000-00805f9b34fb';

  get isConnected(): boolean { return this._connected; }

  async scanAndConnect(): Promise<boolean> {
    try {
      // Dynamic import for BLE plugin — avoids compile-time errors when not installed
      const { Bluetooth } = await import('@nativescript-community/ble' as any).catch(() => ({ Bluetooth: null }));
      if (!Bluetooth) { console.warn('[Printer] BLE plugin not installed'); return false; }
      const bluetooth = new Bluetooth();

      const hasPermission = await bluetooth.hasCoarseLocationPermission();
      if (!hasPermission) await bluetooth.requestCoarseLocationPermission();

      return new Promise<boolean>((resolve) => {
        bluetooth.startScanning({
          seconds: 10,
          onDiscovered: (p: any) => {
            if (p.name && p.name.toLowerCase().includes('printer')) {
              bluetooth.stopScanning();
              this.connectDevice(bluetooth, p.UUID).then(resolve);
            }
          }
        });
        setTimeout(() => { bluetooth.stopScanning(); resolve(false); }, 12000);
      });
    } catch (e) { console.error('[Printer] Scan failed:', e); return false; }
  }

  private async connectDevice(bluetooth: any, uuid: string): Promise<boolean> {
    try {
      await bluetooth.connect({
        UUID: uuid,
        onConnected: (p: any) => { this.peripheral = p; this._connected = true; },
        onDisconnected: () => { this._connected = false; }
      });
      return true;
    } catch { return false; }
  }

  async disconnect(): Promise<void> {
    if (this.peripheral) {
      try {
        const { Bluetooth } = await import('@nativescript-community/ble' as any).catch(() => ({ Bluetooth: null }));
        if (Bluetooth) await new Bluetooth().disconnect({ UUID: this.peripheral.UUID });
      } catch {}
      this._connected = false;
    }
  }

  async sendData(data: Uint8Array): Promise<boolean> {
    if (!this.peripheral || !this._connected) return false;
    try {
      const { Bluetooth } = await import('@nativescript-community/ble' as any).catch(() => ({ Bluetooth: null }));
      if (!Bluetooth) return false;
      const bluetooth = new Bluetooth();
      const CHUNK = 20;
      for (let i = 0; i < data.length; i += CHUNK) {
        await bluetooth.write({
          peripheralUUID: this.peripheral.UUID,
          serviceUUID: this.serviceUUID,
          characteristicUUID: this.characteristicUUID,
          value: data.slice(i, i + CHUNK)
        });
      }
      return true;
    } catch (e) { console.error('[Printer] Write failed:', e); return false; }
  }
}
