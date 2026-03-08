import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-discrepancies',
  template: `
    <ActionBar title="Checkout Discrepancies">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
      <ActionItem text="Refresh" ios.position="right" (tap)="load()"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">

        <!-- Filter tabs -->
        <GridLayout columns="*,*,*,*" class="m-b-4"
          style="background-color:#f3f4f6; border-radius:10; padding:3;">
          <Button col="0" [text]="'All'"                   (tap)="setFilter('')"
            [class]="filterClass('')"/>
          <Button col="1" [text]="'High'"                  (tap)="setFilter('high')"
            [class]="filterClass('high')"/>
          <Button col="2" [text]="'Medium'"                (tap)="setFilter('medium')"
            [class]="filterClass('medium')"/>
          <Button col="3" [text]="'No Exit'"               (tap)="setFilter('missing_security_exit')"
            [class]="filterClass('missing_security_exit')"/>
        </GridLayout>

        <!-- Loading -->
        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-6"/>

        <!-- Empty -->
        <StackLayout *ngIf="!loading && filtered().length === 0"
          style="margin-top:60; align-items:center;">
          <Label text="✓" style="font-size:48; color:#16a34a; text-align:center;"/>
          <Label text="No discrepancies found" class="empty-state"/>
        </StackLayout>

        <!-- Discrepancy rows -->
        <StackLayout *ngFor="let d of filtered()" class="list-item m-b-3"
          [style.border-left-width]="4"
          [style.border-left-color]="severityColor(d.severity)">

          <GridLayout columns="*,auto">
            <Label col="0" [text]="d.guest_name || 'Unknown Guest'" class="list-item-title"/>
            <Label col="1" [text]="d.severity.toUpperCase()"
              [style.color]="severityColor(d.severity)"
              style="font-size:10; font-weight:bold;"/>
          </GridLayout>

          <Label [text]="'Card: ' + d.card_number" class="list-item-subtitle m-t-1"
            style="font-family:monospace;"/>

          <Label [text]="discrepancyLabel(d.discrepancy_type)"
            class="list-item-subtitle" textWrap="true"/>

          <GridLayout *ngIf="d.gap_minutes != null" columns="auto,*" class="m-t-1">
            <Label col="0" text="Gap: " class="list-item-meta"/>
            <Label col="1" [text]="d.gap_minutes + ' min (threshold: ' + d.threshold_minutes + ' min)'"
              class="list-item-meta" [style.color]="severityColor(d.severity)"/>
          </GridLayout>

          <GridLayout columns="auto,*" class="m-t-1" *ngIf="d.receptionist_checkout_at">
            <Label col="0" text="Reception: " class="list-item-meta"/>
            <Label col="1" [text]="formatTime(d.receptionist_checkout_at)" class="list-item-meta"/>
          </GridLayout>
          <GridLayout columns="auto,*" class="m-t-1" *ngIf="d.security_exit_at">
            <Label col="0" text="Security exit: " class="list-item-meta"/>
            <Label col="1" [text]="formatTime(d.security_exit_at)" class="list-item-meta"/>
          </GridLayout>
          <GridLayout columns="auto,*" class="m-t-1" *ngIf="!d.security_exit_at">
            <Label col="0" text="Security exit: " class="list-item-meta"/>
            <Label col="1" text="NOT RECORDED" class="list-item-meta" style="color:#dc2626;"/>
          </GridLayout>

          <Label [text]="'Flagged: ' + formatTime(d.created_at)"
            class="list-item-meta m-t-1"/>
        </StackLayout>

      </StackLayout>
    </ScrollView>
  `
})
export class DiscrepanciesComponent implements OnInit {
  discrepancies: any[] = [];
  loading = false;
  activeFilter = '';

  constructor(private api: SecurityApiService) {}
  ngOnInit() { this.load(); }

  load(): void {
    this.loading = true;
    this.api.getCheckoutDiscrepancies().subscribe({
      next: (r: any) => {
        this.loading = false;
        this.discrepancies = r?.data || [];
      },
      error: () => { this.loading = false; }
    });
  }

  setFilter(f: string): void { this.activeFilter = f; }

  filtered(): any[] {
    if (!this.activeFilter) return this.discrepancies;
    if (this.activeFilter === 'high' || this.activeFilter === 'medium' || this.activeFilter === 'low') {
      return this.discrepancies.filter(d => d.severity === this.activeFilter);
    }
    return this.discrepancies.filter(d => d.discrepancy_type === this.activeFilter);
  }

  filterClass(f: string): string {
    return this.activeFilter === f
      ? 'filter-btn-active'
      : 'filter-btn';
  }

  severityColor(severity: string): string {
    switch (severity) {
      case 'high':   return '#dc2626';
      case 'medium': return '#f79009';
      default:       return '#6b7280';
    }
  }

  discrepancyLabel(type: string): string {
    switch (type) {
      case 'missing_security_exit':        return '⚠ No security exit recorded after receptionist checkout';
      case 'missing_receptionist_checkout': return '⚠ Security exit recorded but no receptionist checkout';
      case 'gap_exceeded':                  return '⚠ Gap between reception checkout and security exit exceeds threshold';
      default:                              return type;
    }
  }

  formatTime(ts: string): string {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    } catch { return ts; }
  }
}
