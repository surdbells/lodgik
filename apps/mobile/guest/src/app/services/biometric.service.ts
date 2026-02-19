import { Injectable } from '@angular/core';
import { ApplicationSettings } from '@nativescript/core';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_saved_token';

/**
 * Biometric authentication service for guest app.
 * Allows guests to re-authenticate using fingerprint/face after initial login.
 * Stores the session token securely and gates access behind biometric verification.
 */
@Injectable({ providedIn: 'root' })
export class BiometricService {
  private fingerprintAuth: any = null;

  constructor() {
    this.loadPlugin();
  }

  private async loadPlugin() {
    try {
      this.fingerprintAuth = await import('nativescript-fingerprint-auth');
    } catch {
      console.log('[BiometricService] Plugin not available');
    }
  }

  /**
   * Check if biometric auth (fingerprint/face) is available on this device.
   */
  async isAvailable(): Promise<{ available: boolean; type: string }> {
    if (!this.fingerprintAuth) return { available: false, type: 'none' };
    try {
      const fp = new this.fingerprintAuth.FingerprintAuth();
      const result = await fp.available();
      return {
        available: result.any || false,
        type: result.face ? 'face' : result.touch ? 'fingerprint' : 'none',
      };
    } catch {
      return { available: false, type: 'none' };
    }
  }

  /**
   * Prompt user for biometric verification.
   * Returns true if verified, false otherwise.
   */
  async verify(message?: string): Promise<boolean> {
    if (!this.fingerprintAuth) return false;
    try {
      const fp = new this.fingerprintAuth.FingerprintAuth();
      await fp.verifyFingerprint({
        title: 'Lodgik Guest',
        message: message || 'Verify your identity to continue',
        fallbackMessage: 'Use PIN instead',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save session token for biometric-protected re-login.
   * Called after successful OTP/access code login.
   */
  enableBiometric(sessionToken: string): void {
    ApplicationSettings.setString(BIOMETRIC_TOKEN_KEY, sessionToken);
    ApplicationSettings.setBoolean(BIOMETRIC_ENABLED_KEY, true);
  }

  /**
   * Check if biometric login is enabled (user has previously logged in and opted in).
   */
  isBiometricEnabled(): boolean {
    return ApplicationSettings.getBoolean(BIOMETRIC_ENABLED_KEY, false) && !!ApplicationSettings.getString(BIOMETRIC_TOKEN_KEY, '');
  }

  /**
   * Retrieve saved session token after biometric verification.
   * Returns token if biometric succeeds, null otherwise.
   */
  async biometricLogin(): Promise<string | null> {
    if (!this.isBiometricEnabled()) return null;

    const verified = await this.verify('Sign in to your room');
    if (!verified) return null;

    return ApplicationSettings.getString(BIOMETRIC_TOKEN_KEY, '') || null;
  }

  /**
   * Clear biometric data on logout.
   */
  clearBiometric(): void {
    ApplicationSettings.remove(BIOMETRIC_TOKEN_KEY);
    ApplicationSettings.setBoolean(BIOMETRIC_ENABLED_KEY, false);
  }
}
