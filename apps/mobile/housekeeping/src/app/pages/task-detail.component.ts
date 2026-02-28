import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { HousekeepingApiService } from '../services/housekeeping-api.service';

@Component({
  selector: 'hk-task-detail',
  standalone: true,
  template: `
    <ActionBar [title]="'Room ' + (task?.room_number || '')">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4" *ngIf="task">
        <!-- Status & Info -->
        <StackLayout class="bg-white rounded-lg p-4 m-b-4">
          <Label [text]="task.task_type.replace('_', ' ')" class="text-lg font-bold m-b-1"></Label>
          <Label [text]="'Status: ' + task.status_label" class="m-b-1" [style.color]="task.status_color"></Label>
          <Label [text]="'Assigned: ' + (task.assigned_to_name || 'Unassigned')" class="text-sm text-muted m-b-1"></Label>
          <Label [text]="'Est: ' + task.estimated_minutes + ' min'" class="text-sm text-muted"></Label>
        </StackLayout>

        <!-- Checklist -->
        <StackLayout *ngIf="task.checklist" class="bg-white rounded-lg p-4 m-b-4">
          <Label text="Cleaning Checklist" class="font-bold m-b-2"></Label>
          <StackLayout *ngFor="let item of task.checklist; let i = index">
            <GridLayout columns="auto,*" (tap)="toggleCheck(i)" class="p-y-2">
              <Label col="0" [text]="item.checked ? '☑' : '☐'" class="text-lg m-r-3"></Label>
              <Label col="1" [text]="item.item" [class]="item.checked ? 'text-muted' : ''"></Label>
            </GridLayout>
          </StackLayout>
        </StackLayout>

        <!-- Photos -->
        <StackLayout class="bg-white rounded-lg p-4 m-b-4">
          <Label text="Photos" class="font-bold m-b-2"></Label>
          <GridLayout columns="*,*" class="m-b-2">
            <StackLayout col="0" class="text-center">
              <Button text="📷 Before" (tap)="takePhoto('before')" class="btn-outline"></Button>
              <Label [text]="task.photo_before ? '✅ Uploaded' : 'No photo'" class="text-xs text-muted m-t-1"></Label>
            </StackLayout>
            <StackLayout col="1" class="text-center">
              <Button text="📷 After" (tap)="takePhoto('after')" class="btn-outline"></Button>
              <Label [text]="task.photo_after ? '✅ Uploaded' : 'No photo'" class="text-xs text-muted m-t-1"></Label>
            </StackLayout>
          </GridLayout>
        </StackLayout>

        <!-- Notes -->
        <StackLayout class="bg-white rounded-lg p-4 m-b-4">
          <Label text="Notes" class="font-bold m-b-1"></Label>
          <Label [text]="task.notes || 'No notes'" class="text-sm text-muted"></Label>
        </StackLayout>

        <!-- Actions -->
        <StackLayout class="m-b-8">
          <Button *ngIf="task.status === 'assigned'" text="▶ Start Cleaning" (tap)="startTask()" class="btn-primary m-b-2"></Button>
          <Button *ngIf="task.status === 'in_progress'" text="✅ Mark Complete" (tap)="completeTask()" class="btn btn-success m-b-2 text-lg p-4"></Button>
          <Button *ngIf="task.status === 'completed'" text="🔍 Pass Inspection" (tap)="inspect(true)" class="btn-primary m-b-2"></Button>
          <Button *ngIf="task.status === 'completed'" text="🔄 Needs Rework" (tap)="inspect(false)" class="btn btn-danger"></Button>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class TaskDetailComponent implements OnInit {
  task: any = null;

  constructor(private route: ActivatedRoute, private api: HousekeepingApiService, public router: RouterExtensions) {}

  ngOnInit() {
    // Task data would be loaded from a local cache or API
    // For now, load from tasks list endpoint and filter
  }

  toggleCheck(index: number) {
    if (this.task?.checklist?.[index]) {
      this.task.checklist[index].checked = !this.task.checklist[index].checked;
    }
  }

  async takePhoto(type: 'before' | 'after') {
    try {
      const { requestPermissions, takePicture } = await import('@nativescript/camera');
      await requestPermissions();
      const img = await takePicture({ width: 1024, height: 1024, keepAspectRatio: true, saveToGallery: false });
      const base64 = img.toBase64String('jpg', 80);
      const data = type === 'before' ? { photo_before: base64 } : { photo_after: base64 };
      this.api.uploadPhoto(this.task.id, data).subscribe({
        next: (r: any) => { if (type === 'before') this.task.photo_before = base64; else this.task.photo_after = base64; }
      });
    } catch (e) { console.error('Camera error:', e); }
  }

  startTask() {
    this.api.startTask(this.task.id).subscribe({
      next: (r: any) => { this.task = r.data; },
    });
  }

  completeTask() {
    this.api.completeTask(this.task.id, { checklist: this.task.checklist, photo_after: this.task.photo_after }).subscribe({
      next: (r: any) => { this.task = r.data; },
    });
  }

  inspect(passed: boolean) {
    this.api.inspectTask(this.task.id, { passed, notes: passed ? 'Approved' : 'Needs rework' }).subscribe({
      next: (r: any) => { this.task = r.data; },
    });
  }
}
