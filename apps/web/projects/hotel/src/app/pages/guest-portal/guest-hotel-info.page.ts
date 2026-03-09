import { Component, signal, inject, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Wifi, Eye, EyeOff, Copy, CheckCheck, Dumbbell, Waves, Utensils, Coffee, Car, Gem, MapPin, Phone, Mail } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-hotel-info',
  standalone: true,
  imports: [TitleCasePipe, RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div>
          <h2 class="text-lg font-bold" [class]="th.text()">Hotel Info</h2>
          <p class="text-xs" [class]="th.muted()">WiFi, amenities & contact</p>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      @if (!loading() && info()) {

        <!-- Hotel name/contact -->
        @if (info().hotel?.name) {
          <div class="rounded-2xl p-5 mb-4" [class]="th.card()">
            <h3 class="text-base font-bold mb-3" [class]="th.text()">{{ info().hotel.name }}</h3>
            <div class="space-y-2">
              @if (info().hotel.address) {
                <div class="flex items-start gap-2.5 text-sm" [class]="th.muted()">
                  <lucide-icon [img]="MapPinIcon" class="w-4 h-4 mt-0.5 shrink-0" [class]="th.accent()"></lucide-icon>
                  <span>{{ info().hotel.address }}</span>
                </div>
              }
              @if (info().hotel.phone) {
                <div class="flex items-center gap-2.5 text-sm" [class]="th.muted()">
                  <lucide-icon [img]="PhoneIcon" class="w-4 h-4 shrink-0" [class]="th.accent()"></lucide-icon>
                  <a [href]="'tel:' + info().hotel.phone" [class]="th.accent()">{{ info().hotel.phone }}</a>
                </div>
              }
              @if (info().hotel.email) {
                <div class="flex items-center gap-2.5 text-sm" [class]="th.muted()">
                  <lucide-icon [img]="MailIcon" class="w-4 h-4 shrink-0" [class]="th.accent()"></lucide-icon>
                  <a [href]="'mailto:' + info().hotel.email" [class]="th.accent()">{{ info().hotel.email }}</a>
                </div>
              }
            </div>
          </div>
        }

        <!-- WiFi -->
        @if (info().wifi?.ssid) {
          <div class="rounded-2xl p-5 mb-4" [class]="th.card()">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <lucide-icon [img]="WifiIcon" class="w-5 h-5 text-blue-400"></lucide-icon>
              </div>
              <div>
                <p class="text-sm font-bold" [class]="th.text()">WiFi Access</p>
                <p class="text-xs" [class]="th.muted()">Connect to the hotel network</p>
              </div>
            </div>

            <!-- SSID -->
            <div class="rounded-xl p-3 mb-2" [class]="th.cardSubtle()">
              <p class="text-[11px] font-medium mb-1" [class]="th.subtle()">Network Name (SSID)</p>
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold font-mono" [class]="th.text()">{{ info().wifi.ssid }}</p>
                <button (click)="copy(info().wifi.ssid, 'ssid')"
                  class="flex items-center gap-1 text-xs transition-colors" [class]="th.accent()">
                  @if (copied() === 'ssid') {
                    <lucide-icon [img]="CheckCheckIcon" class="w-3.5 h-3.5"></lucide-icon>
                    Copied
                  } @else {
                    <lucide-icon [img]="CopyIcon" class="w-3.5 h-3.5"></lucide-icon>
                    Copy
                  }
                </button>
              </div>
            </div>

            <!-- Password -->
            @if (info().wifi.password) {
              <div class="rounded-xl p-3" [class]="th.cardSubtle()">
                <p class="text-[11px] font-medium mb-1" [class]="th.subtle()">Password</p>
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold font-mono flex-1" [class]="th.text()">
                    {{ showPassword() ? info().wifi.password : '••••••••' }}
                  </p>
                  <button (click)="showPassword.set(!showPassword())"
                    class="transition-colors" [class]="th.muted()">
                    @if (showPassword()) {
                      <lucide-icon [img]="EyeOffIcon" class="w-4 h-4"></lucide-icon>
                    } @else {
                      <lucide-icon [img]="EyeIcon" class="w-4 h-4"></lucide-icon>
                    }
                  </button>
                  <button (click)="copy(info().wifi.password, 'pass')"
                    class="flex items-center gap-1 text-xs transition-colors" [class]="th.accent()">
                    @if (copied() === 'pass') {
                      <lucide-icon [img]="CheckCheckIcon" class="w-3.5 h-3.5"></lucide-icon>
                      Copied
                    } @else {
                      <lucide-icon [img]="CopyIcon" class="w-3.5 h-3.5"></lucide-icon>
                      Copy
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Amenities -->
        @if (info().amenities?.length) {
          <div class="mb-4">
            <h3 class="text-xs font-bold uppercase tracking-wide mb-3" [class]="th.muted()">Hotel Amenities</h3>
            <div class="grid grid-cols-2 gap-3">
              @for (a of info().amenities; track a.id) {
                <div class="rounded-2xl p-4 flex items-center gap-3" [class]="th.card()">
                  <div class="w-9 h-9 bg-amber-400/20 rounded-xl flex items-center justify-center shrink-0">
                    <span class="text-lg">{{ amenityEmoji(a.amenity_type ?? a.name) }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold truncate" [class]="th.text()">{{ a.name }}</p>
                    @if (a.location) {
                      <p class="text-[11px] truncate" [class]="th.subtle()">{{ a.location }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Vouchers -->
        @if (info().vouchers?.length) {
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wide mb-3" [class]="th.muted()">Your Vouchers</h3>
            @for (v of info().vouchers; track v.id) {
              <div class="rounded-2xl p-4 mb-3 flex items-center justify-between" [class]="th.card()">
                <div>
                  <p class="text-sm font-bold" [class]="th.text()">{{ v.amenity_name }}</p>
                  <p class="text-xs mt-0.5" [class]="th.muted()">Valid: {{ v.valid_date }}</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-black font-mono text-amber-400">{{ v.code }}</p>
                  <span class="text-[11px] px-2 py-0.5 rounded-full"
                    [class]="v.status === 'active' ? (th.isDark() ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                            : (th.isDark() ? 'bg-white/10 text-white/40' : 'bg-gray-100 text-gray-500')">
                    {{ v.status | titlecase }}
                  </span>
                </div>
              </div>
            }
          </div>
        }

        <!-- No wifi/amenity fallback -->
        @if (!info().wifi?.ssid && !info().amenities?.length && !info().hotel?.name) {
          <div class="text-center py-16">
            <p class="text-sm" [class]="th.muted()">No hotel information available yet.</p>
            <p class="text-xs mt-1" [class]="th.subtle()">Please ask at the front desk.</p>
          </div>
        }

      }
    </div>
  `,
})
export default class GuestHotelInfoPage implements OnInit {
  private api = inject(GuestApiService);
  readonly th = inject(GuestThemeService);

  readonly ArrowLeftIcon  = ArrowLeft;
  readonly WifiIcon       = Wifi;
  readonly EyeIcon        = Eye;
  readonly EyeOffIcon     = EyeOff;
  readonly CopyIcon       = Copy;
  readonly CheckCheckIcon = CheckCheck;
  readonly MapPinIcon     = MapPin;
  readonly PhoneIcon      = Phone;
  readonly MailIcon       = Mail;

  info         = signal<any | null>(null);
  loading      = signal(true);
  showPassword = signal(false);
  copied       = signal<'ssid' | 'pass' | null>(null);

  ngOnInit(): void {
    this.api.get<any>('/guest/hotel-info').subscribe({
      next: (r: any) => { this.info.set(r.data ?? {}); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  copy(text: string, which: 'ssid' | 'pass'): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(which);
      setTimeout(() => this.copied.set(null), 2000);
    }).catch(() => {});
  }

  amenityEmoji(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('gym') || t.includes('fitness')) return '🏋️';
    if (t.includes('pool') || t.includes('swim'))   return '🏊';
    if (t.includes('spa') || t.includes('massage')) return '💆';
    if (t.includes('restaurant') || t.includes('food') || t.includes('dining')) return '🍽️';
    if (t.includes('bar') || t.includes('lounge'))  return '🍸';
    if (t.includes('café') || t.includes('coffee')) return '☕';
    if (t.includes('park'))                         return '🚗';
    if (t.includes('laundry') || t.includes('dry')) return '👔';
    if (t.includes('business') || t.includes('conference')) return '💼';
    if (t.includes('wifi') || t.includes('internet')) return '📶';
    return '✨';
  }
}
