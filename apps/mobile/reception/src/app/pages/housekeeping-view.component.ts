import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'housekeeping-view',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Housekeeping"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <GridLayout rows="auto,auto,*">
      <GridLayout row="0" columns="*,*,*,*" class="p-4">
        <StackLayout col="0" class="bg-white rounded-lg p-2 m-r-2 text-center border"><Label [text]="stats.total" class="text-xl font-bold"></Label><Label text="Total" class="text-xs text-gray-500"></Label></StackLayout>
        <StackLayout col="1" class="bg-white rounded-lg p-2 m-r-2 text-center border"><Label [text]="stats.pending" class="text-xl font-bold text-amber"></Label><Label text="Pending" class="text-xs text-gray-500"></Label></StackLayout>
        <StackLayout col="2" class="bg-white rounded-lg p-2 m-r-2 text-center border"><Label [text]="stats.in_progress" class="text-xl font-bold text-blue"></Label><Label text="Active" class="text-xs text-gray-500"></Label></StackLayout>
        <StackLayout col="3" class="bg-white rounded-lg p-2 text-center border"><Label [text]="stats.completed" class="text-xl font-bold text-green"></Label><Label text="Done" class="text-xs text-gray-500"></Label></StackLayout>
      </GridLayout>

      <SegmentedBar row="1" [selectedIndex]="filterIdx" (selectedIndexChanged)="onFilter($event)" class="m-x-4 m-b-2">
        <SegmentedBarItem title="All"></SegmentedBarItem>
        <SegmentedBarItem title="Pending"></SegmentedBarItem>
        <SegmentedBarItem title="Active"></SegmentedBarItem>
        <SegmentedBarItem title="Done"></SegmentedBarItem>
      </SegmentedBar>

      <ScrollView row="2">
        <StackLayout class="p-4">
          <StackLayout *ngFor="let t of filtered" class="bg-white rounded-xl p-3 m-b-2 border">
            <GridLayout columns="auto,*,auto">
              <Label col="0" [text]="priorityIcon(t.priority)" class="text-lg m-r-3"></Label>
              <StackLayout col="1">
                <Label [text]="'Room ' + t.room_number" class="font-bold"></Label>
                <Label [text]="t.task_type + ' · ' + (t.assigned_to_name || 'Unassigned')" class="text-xs text-gray-500"></Label>
              </StackLayout>
              <Label col="2" [text]="t.status_label" class="text-xs font-bold" [style.color]="t.status_color"></Label>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!filtered.length" text="No tasks found" class="text-center text-gray-400 p-8"></Label>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class HousekeepingViewComponent implements OnInit {
  tasks: any[] = [];
  filtered: any[] = [];
  stats = { total: 0, pending: 0, in_progress: 0, completed: 0 };
  filterIdx = 0;
  private statusMap = ['', 'pending', 'in_progress', 'completed'];

  constructor(private api: ReceptionApiService, public router: RouterExtensions) {}

  ngOnInit() {
    this.api.getHousekeepingTasks().subscribe({ next: (r: any) => { this.tasks = r.data || []; this.applyFilter(); } });
    this.api.getHousekeepingStats().subscribe({ next: (r: any) => this.stats = r.data || this.stats });
  }

  onFilter(e: any) { this.filterIdx = e.object?.selectedIndex || 0; this.applyFilter(); }
  applyFilter() {
    const s = this.statusMap[this.filterIdx];
    this.filtered = s ? this.tasks.filter(t => t.status === s) : this.tasks;
  }

  priorityIcon(p: number): string { return p <= 1 ? '🔴' : p === 2 ? '🟠' : p === 3 ? '🟡' : '🟢'; }
}
