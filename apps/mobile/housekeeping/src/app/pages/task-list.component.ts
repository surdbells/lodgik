import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { HousekeepingApiService } from '../services/housekeeping-api.service';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'hk-task-list',
  standalone: true,
  template: `
    <ActionBar title="Housekeeping Tasks">
      <ActionItem text="Lost&Found" (tap)="router.navigate(['/lost-found'])" ios.position="right"></ActionItem>
      <ActionItem text="🔔" (tap)="router.navigate(["/notifications"])" ios.position="right"></ActionItem>
    </ActionBar>
    <StackLayout class="p-4">
      <!-- Stats Bar -->
      <GridLayout columns="*,*,*,*" class="bg-white rounded-lg p-3 m-b-4">
        <StackLayout col="0" class="text-center"><Label text="{{stats.total}}" class="text-xl font-bold"></Label><Label text="Total" class="text-xs text-muted"></Label></StackLayout>
        <StackLayout col="1" class="text-center"><Label text="{{stats.pending}}" class="text-xl font-bold text-warning"></Label><Label text="Pending" class="text-xs text-muted"></Label></StackLayout>
        <StackLayout col="2" class="text-center"><Label text="{{stats.in_progress}}" class="text-xl font-bold text-primary"></Label><Label text="Active" class="text-xs text-muted"></Label></StackLayout>
        <StackLayout col="3" class="text-center"><Label text="{{stats.completed}}" class="text-xl font-bold text-success"></Label><Label text="Done" class="text-xs text-muted"></Label></StackLayout>
      </GridLayout>

      <!-- Filter -->
      <SegmentedBar [selectedIndex]="filterIndex" (selectedIndexChanged)="onFilterChange($event)" class="m-b-4">
        <SegmentedBarItem title="All"></SegmentedBarItem>
        <SegmentedBarItem title="Pending"></SegmentedBarItem>
        <SegmentedBarItem title="Active"></SegmentedBarItem>
        <SegmentedBarItem title="Done"></SegmentedBarItem>
      </SegmentedBar>

      <!-- Task List -->
      <ScrollView>
        <StackLayout>
          <StackLayout *ngFor="let task of filteredTasks" (tap)="openTask(task)" class="bg-white rounded-lg p-3 m-b-2">
            <GridLayout columns="auto,*,auto" class="m-b-1">
              <Label col="0" [text]="priorityIcon(task.priority)" class="text-lg m-r-2"></Label>
              <StackLayout col="1">
                <Label [text]="'Room ' + task.room_number" class="font-bold"></Label>
                <Label [text]="task.task_type.replace('_', ' ')" class="text-xs text-muted"></Label>
              </StackLayout>
              <Label col="2" [text]="task.status_label" [class]="'text-xs rounded-full p-x-2 p-y-1 ' + statusClass(task.status)"></Label>
            </GridLayout>
            <GridLayout columns="*,*" class="text-xs text-muted">
              <Label col="0" [text]="task.assigned_to_name || 'Unassigned'"></Label>
              <Label col="1" [text]="task.estimated_minutes + ' min est.'" class="text-right"></Label>
            </GridLayout>
            <Button *ngIf="task.status === 'pending' && !task.assigned_to_name" text="Assign to me" (tap)="selfAssign(task, $event)" class="btn-outline m-t-2" style="font-size:11;"></Button>
          </StackLayout>
          <Label *ngIf="filteredTasks.length === 0" text="No tasks found" class="text-center text-muted p-8"></Label>
        </StackLayout>
      </ScrollView>
    </StackLayout>
  `,
})
export class TaskListComponent implements OnInit {
  tasks: any[] = [];
  filteredTasks: any[] = [];
  stats = { total: 0, pending: 0, in_progress: 0, completed: 0 };
  filterIndex = 0;
  private propertyId = '';
  private statusFilters = ['', 'pending', 'in_progress', 'completed'];

  constructor(private api: HousekeepingApiService, public router: RouterExtensions) {
    this.propertyId = ApplicationSettings.getString('hk_property_id', '');
  }

  ngOnInit() { this.load(); }

  load() {
    this.api.getTasks(this.propertyId).subscribe({
      next: (r: any) => { this.tasks = r.data || []; this.applyFilter(); },
    });
    this.api.todayStats(this.propertyId).subscribe({
      next: (r: any) => this.stats = r.data || this.stats,
    });
  }

  onFilterChange(e: any) { this.filterIndex = e.value || e.object?.selectedIndex || 0; this.applyFilter(); }

  applyFilter() {
    const s = this.statusFilters[this.filterIndex];
    this.filteredTasks = s ? this.tasks.filter(t => t.status === s) : this.tasks;
  }

  openTask(task: any) { this.router.navigate(['/tasks', task.id]); }

  priorityIcon(p: number): string { return p <= 1 ? '🔴' : p === 2 ? '🟠' : p === 3 ? '🟡' : '🟢'; }
  selfAssign(task: any, event: any) {
    event?.object?.stopPropagation?.();
    this.api.selfAssignTask(task.id).subscribe({
      next: (r: any) => { task.assigned_to_name = r.data?.assigned_to_name || 'You'; },
    });
  }

  statusClass(s: string): string {
    return s === 'pending' ? 'bg-gray' : s === 'in_progress' ? 'bg-blue' : s === 'completed' ? 'bg-green' : s === 'inspected' ? 'bg-teal' : 'bg-red';
  }
}
