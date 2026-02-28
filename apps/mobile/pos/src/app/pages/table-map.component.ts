import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { PosApiService } from '../services/pos-api.service';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'pos-tables',
  standalone: true,
  template: `
    <ActionBar title="Tables">
      <ActionItem text="Menu" (tap)="router.navigate(['/menu'])" ios.position="right"></ActionItem>
    <ActionItem text="🔔" (tap)="router.navigate(["/notifications"])" ios.position="right"></ActionItem>
    </ActionBar>
    <GridLayout rows="auto,*">
      <!-- Section Filter -->
      <SegmentedBar row="0" [selectedIndex]="sectionIndex" (selectedIndexChanged)="onSectionChange($event)" class="m-4">
        <SegmentedBarItem title="All"></SegmentedBarItem>
        <SegmentedBarItem title="Restaurant"></SegmentedBarItem>
        <SegmentedBarItem title="Bar"></SegmentedBarItem>
        <SegmentedBarItem title="Poolside"></SegmentedBarItem>
      </SegmentedBar>

      <ScrollView row="1">
        <WrapLayout class="p-4">
          <StackLayout *ngFor="let table of filteredTables" (tap)="openTable(table)" class="m-2 rounded-lg p-4 text-center" [ngStyle]="{'background-color': tableColor(table.status), 'width': '140', 'height': '120'}">
            <Label [text]="table.number" class="text-2xl font-bold text-white"></Label>
            <Label [text]="table.seats + ' seats'" class="text-xs text-white"></Label>
            <Label [text]="table.status" class="text-xs text-white m-t-2"></Label>
            <Label [text]="table.section" class="text-xs text-white opacity-60"></Label>
          </StackLayout>
        </WrapLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class TableMapComponent implements OnInit {
  tables: any[] = [];
  filteredTables: any[] = [];
  sectionIndex = 0;
  private sections = ['', 'restaurant', 'bar', 'poolside'];
  private propertyId = '';

  constructor(private api: PosApiService, public router: RouterExtensions) {
    this.propertyId = ApplicationSettings.getString('pos_property_id', '');
  }

  ngOnInit() { this.load(); }

  load() {
    this.api.getTables(this.propertyId).subscribe({
      next: (r: any) => { this.tables = r.data || []; this.applyFilter(); },
    });
  }

  onSectionChange(e: any) { this.sectionIndex = e.object?.selectedIndex || 0; this.applyFilter(); }
  applyFilter() {
    const s = this.sections[this.sectionIndex];
    this.filteredTables = s ? this.tables.filter(t => t.section === s) : this.tables;
  }

  openTable(table: any) {
    if (table.status === 'occupied' && table.current_order_id) {
      this.router.navigate(['/order', table.current_order_id]);
    } else {
      // Create new order for this table
      this.api.createOrder({ property_id: this.propertyId, table_id: table.id, order_type: 'dine_in' }).subscribe({
        next: (r: any) => this.router.navigate(['/order', r.data.id]),
      });
    }
  }

  tableColor(status: string): string {
    return status === 'available' ? '#22c55e' : status === 'occupied' ? '#3b82f6' : status === 'reserved' ? '#8b5cf6' : '#6b7280';
  }
}
