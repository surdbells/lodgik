import { Component } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-incident-report',
  template: `
    <ActionBar title="Report Incident">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">

        <Label text="INCIDENT TYPE" class="section-title"/>
        <GridLayout columns="*,*" rows="auto,auto" class="m-b-4">
          <Button *ngFor="let t of types; let i = index" [col]="i % 2" [row]="Math.floor(i / 2)"
            [text]="t.label" (tap)="incidentType = t.value" class="m-1"
            [class]="incidentType === t.value ? 'btn-danger' : 'btn-secondary'"
            style="font-size:13;"/>
        </GridLayout>

        <Label text="DESCRIPTION" class="input-label"/>
        <TextField [(ngModel)]="description" hint="Describe the incident" class="input m-b-3"/>
        <Label text="LOCATION" class="input-label"/>
        <TextField [(ngModel)]="location" hint="e.g. Lobby, Floor 3" class="input m-b-4"/>

        <Button text="SUBMIT INCIDENT REPORT" (tap)="submit()" class="btn-danger"/>
        <Label *ngIf="msg" [text]="msg" class="text-success font-bold text-center m-t-3"/>
      </StackLayout>
    </ScrollView>
  `
})
export class IncidentReportComponent {
  Math = Math;
  incidentType = ''; description = ''; location = ''; msg = '';
  types = [
    { value: 'security', label: 'Security Breach' }, { value: 'fire', label: 'Fire' },
    { value: 'safety', label: 'Safety Hazard' },     { value: 'breakdown', label: 'Equipment' },
  ];
  constructor(private api: SecurityApiService) {}
  submit() {
    if (!this.incidentType || !this.description) return;
    this.api.reportIncident({ asset_id: 'GENERAL', asset_name: 'General', incident_type: this.incidentType, priority: 'high', description: this.description, location_description: this.location, reporter_name: 'Security Post' })
      .subscribe({ next: () => { this.msg = 'Incident reported successfully'; this.description = ''; this.location = ''; this.incidentType = ''; } });
  }
}
