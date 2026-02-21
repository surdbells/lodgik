import { Component } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-incident-report',
  template: `
    <ActionBar title="Report Incident" class="action-bar" style="background-color:#d32f2f; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-15">
        <Label text="Incident Type" class="m-b-5" style="font-weight:bold;"/>
        <GridLayout columns="*,*" rows="auto,auto" class="m-b-15">
          <Button *ngFor="let t of types; let i = index" [col]="i % 2" [row]="Math.floor(i / 2)"
            [text]="t.label" (tap)="incidentType = t.value" class="m-3"
            [style.background-color]="incidentType === t.value ? '#d32f2f' : '#e0e0e0'"
            [style.color]="incidentType === t.value ? 'white' : '#333'"
            style="padding:12; border-radius:8; font-size:13;"/>
        </GridLayout>
        <TextField [(ngModel)]="description" hint="Describe the incident" class="m-b-10" style="border-width:1; border-color:#ccc; padding:12; border-radius:8;"/>
        <TextField [(ngModel)]="location" hint="Location (e.g., Lobby, Floor 3)" class="m-b-10" style="border-width:1; border-color:#ccc; padding:12; border-radius:8;"/>
        <Button text="SUBMIT INCIDENT REPORT" (tap)="submit()" style="background-color:#d32f2f; color:white; padding:15; border-radius:8; font-weight:bold;"/>
        <Label *ngIf="msg" [text]="msg" class="m-t-10" style="color:#2e7d32; font-weight:bold; text-align:center;"/>
      </StackLayout>
    </ScrollView>
  `
})
export class IncidentReportComponent {
  Math = Math;
  incidentType = ''; description = ''; location = ''; msg = '';
  types = [
    { value: 'security', label: 'Security Breach' }, { value: 'fire', label: 'Fire' },
    { value: 'safety', label: 'Safety Hazard' }, { value: 'breakdown', label: 'Equipment' },
  ];
  constructor(private api: SecurityApiService) {}
  submit() {
    if (!this.incidentType || !this.description) return;
    this.api.reportIncident({ asset_id: 'GENERAL', asset_name: 'General', incident_type: this.incidentType, priority: 'high', description: this.description, location_description: this.location, reporter_name: 'Security Post' })
      .subscribe({ next: () => { this.msg = 'Incident reported successfully'; this.description = ''; this.location = ''; this.incidentType = ''; } });
  }
}
