import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'AccessCode',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Digital Key" class="bg-white">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <FlexboxLayout flexDirection="column" alignItems="center" justifyContent="center" class="p-6">
      <Label text="🔑" class="text-6xl m-b-4"></Label>
      <Label text="Your Access Code" class="text-lg text-gray-500 m-b-2"></Label>

      <StackLayout class="bg-blue-600 rounded-2xl p-6 m-b-4" width="280">
        <Label [text]="displayCode" class="text-white text-4xl font-bold text-center tracking-widest"></Label>
      </StackLayout>

      <Label text="Show this code to hotel staff for access to services" textWrap="true" class="text-gray-400 text-center text-sm m-b-4" width="250"></Label>

      <StackLayout class="bg-gray-50 border rounded-xl p-4 m-b-4" width="280">
        <FlexboxLayout justifyContent="space-between" class="m-b-2">
          <Label text="Guest" class="text-gray-400 text-xs"></Label>
          <Label [text]="guestName" class="font-bold text-sm"></Label>
        </FlexboxLayout>
        <FlexboxLayout justifyContent="space-between" class="m-b-2">
          <Label text="Booking" class="text-gray-400 text-xs"></Label>
          <Label [text]="bookingRef" class="font-bold text-sm"></Label>
        </FlexboxLayout>
        <FlexboxLayout justifyContent="space-between">
          <Label text="Check-out" class="text-gray-400 text-xs"></Label>
          <Label [text]="checkOut" class="font-bold text-sm"></Label>
        </FlexboxLayout>
      </StackLayout>

      <Label text="Code expires at checkout" class="text-gray-300 text-xs"></Label>
    </FlexboxLayout>
  `,
})
export class AccessCodeComponent implements OnInit {
  displayCode = '------';
  guestName = '';
  bookingRef = '';
  checkOut = '';

  constructor(private api: ApiService, public router: RouterExtensions) {}

  ngOnInit() {
    const session = this.api.getSession();
    this.guestName = session?.guest?.name || '';
    this.bookingRef = session?.booking?.ref || '';
    this.checkOut = session?.booking?.check_out || '';

    // Fetch the guest's access code from the portal session endpoint
    this.api.get('/guest/booking').subscribe({
      next: (r: any) => {
        const code = r?.data?.access_code;
        this.displayCode = code ?? '——';
      },
      error: () => {
        this.displayCode = '——';
      },
      });
    }
  }
}
