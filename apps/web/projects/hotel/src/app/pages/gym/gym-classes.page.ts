import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-gym-classes',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Class Schedule" subtitle="Manage fitness classes and bookings">
      <button (click)="showForm = true; resetForm()" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ New Class</button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- Week Navigation -->
    <div class="flex items-center justify-between mb-4">
      <button (click)="prevWeek()" class="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">← Prev</button>
      <span class="text-sm font-medium text-gray-600">{{ weekLabel }}</span>
      <button (click)="nextWeek()" class="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">Next →</button>
    </div>

    <!-- Weekly Calendar -->
    <div class="grid grid-cols-7 gap-2 mb-6">
      @for (day of weekDays; track day.label) {
        <div class="bg-white border rounded-lg p-3 min-h-[120px]">
          <div class="text-xs font-medium text-gray-500 mb-2">{{ day.label }}</div>
          @for (c of getClassesForDay(day.date); track c.id) {
            <div class="p-2 rounded mb-1 text-xs cursor-pointer hover:opacity-80" [class]="c.is_cancelled ? 'bg-gray-100 line-through' : 'bg-blue-50 border-l-2 border-blue-400'" (click)="selectClass(c)">
              <div class="font-medium">{{ c.name }}</div>
              <div class="text-gray-500">{{ formatTime(c.scheduled_at) }}</div>
              <div class="text-gray-400">{{ c.spots_left }}/{{ c.max_capacity }} spots</div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Class Detail / Bookings -->
    @if (selectedClass()) {
      <div class="bg-white border rounded-xl p-6 mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold">{{ selectedClass().name }}</h3>
            <div class="text-sm text-gray-500">{{ selectedClass().scheduled_at }} · {{ selectedClass().duration_minutes }}min · {{ selectedClass().category }}</div>
            @if (selectedClass().instructor_name) { <div class="text-sm text-gray-500">Instructor: {{ selectedClass().instructor_name }}</div> }
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-blue-600">{{ selectedClass().spots_left }}</div>
            <div class="text-xs text-gray-400">spots left</div>
          </div>
        </div>

        <!-- Book a member -->
        <div class="flex gap-2 mb-4">
          <input [(ngModel)]="bookMemberSearch" (ngModelChange)="searchForBooking()" placeholder="Search member to book..." class="flex-1 border rounded-lg px-3 py-2 text-sm"/>
        </div>
        @if (bookSearchResults().length) {
          <div class="space-y-1 mb-4">
            @for (m of bookSearchResults(); track m.id) {
              <div class="flex justify-between items-center p-2 border rounded hover:bg-blue-50">
                <span class="text-sm">{{ m.full_name }}</span>
                <button (click)="bookMember(m.id)" class="bg-blue-600 text-white px-3 py-1 rounded text-xs">Book</button>
              </div>
            }
          </div>
        }

        <!-- Bookings -->
        <h4 class="text-sm font-medium text-gray-600 mb-2">Bookings ({{ classBookings().length }})</h4>
        <div class="space-y-1">
          @for (b of classBookings(); track b.id) {
            <div class="flex justify-between items-center p-2 border rounded text-sm">
              <span>{{ b.member_id }}</span>
              <span class="text-xs px-2 py-0.5 rounded" [class]="b.status === 'booked' ? 'bg-blue-100 text-blue-700' : b.status === 'attended' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">{{ b.status }}</span>
            </div>
          }
        </div>
      </div>
    }

    <!-- New Class Modal -->
    @if (showForm) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" (click)="showForm = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Schedule New Class</h3>
          <div class="space-y-3">
            <div><label class="text-xs text-gray-500">Class Name *</label><input [(ngModel)]="form.name" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            <div><label class="text-xs text-gray-500">Date & Time *</label><input [(ngModel)]="form.scheduled_at" type="datetime-local" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-gray-500">Duration (min)</label><input [(ngModel)]="form.duration_minutes" type="number" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div><label class="text-xs text-gray-500">Max Capacity</label><input [(ngModel)]="form.max_capacity" type="number" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            </div>
            <div><label class="text-xs text-gray-500">Instructor</label><input [(ngModel)]="form.instructor_name" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-gray-500">Category</label>
                <select [(ngModel)]="form.category" class="w-full border rounded-lg px-3 py-2 text-sm">
                  @for (cat of categories; track cat) { <option [value]="cat">{{ cat }}</option> }
                </select>
              </div>
              <div><label class="text-xs text-gray-500">Location</label><input [(ngModel)]="form.location" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showForm = false" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="saveClass()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Create</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GymClassesPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  loading = signal(true);
  classes = signal<any[]>([]);
  selectedClass = signal<any>(null);
  classBookings = signal<any[]>([]);
  bookSearchResults = signal<any[]>([]);
  bookMemberSearch = '';
  showForm = false;
  form: any = {};
  categories = ['yoga', 'hiit', 'spin', 'pilates', 'boxing', 'dance', 'crossfit', 'other'];
  weekOffset = 0;
  weekDays: { label: string; date: string }[] = [];
  weekLabel = '';

  ngOnInit() { this.buildWeek(); this.load(); }

  buildWeek() {
    const now = new Date();
    now.setDate(now.getDate() + this.weekOffset * 7 - now.getDay() + 1);
    this.weekDays = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      this.weekDays.push({ label: `${days[i]} ${d.getDate()}`, date: d.toISOString().split('T')[0] });
    }
    this.weekLabel = `${this.weekDays[0].date} — ${this.weekDays[6].date}`;
  }

  prevWeek() { this.weekOffset--; this.buildWeek(); this.load(); }
  nextWeek() { this.weekOffset++; this.buildWeek(); this.load(); }

  load() {
    const pid = this.auth.currentUser?.property_id || '';
    this.api.get(`/gym/classes?property_id=${pid}&from=${this.weekDays[0].date}&to=${this.weekDays[6].date}T23:59:59`).subscribe({
      next: (r: any) => { this.classes.set(r.data || []); this.loading.set(false); },
    });
  }

  getClassesForDay(date: string): any[] { return this.classes().filter(c => c.scheduled_at?.startsWith(date)); }
  formatTime(dt: string): string { return dt?.split(' ')[1]?.substring(0, 5) || ''; }

  selectClass(c: any) {
    this.selectedClass.set(c);
    this.api.get(`/gym/classes/${c.id}/bookings`).subscribe({ next: (r: any) => this.classBookings.set(r.data || []) });
  }

  searchForBooking() {
    if (this.bookMemberSearch.length < 2) { this.bookSearchResults.set([]); return; }
    this.api.get(`/gym/members?property_id=${this.auth.currentUser?.property_id || ''}&search=${this.bookMemberSearch}`).subscribe({
      next: (r: any) => this.bookSearchResults.set(r.data || []),
    });
  }

  bookMember(memberId: string) {
    const cls = this.selectedClass();
    if (!cls) return;
    this.api.post('/gym/classes/book', { class_id: cls.id, member_id: memberId }).subscribe({
      next: () => { this.bookMemberSearch = ''; this.bookSearchResults.set([]); this.selectClass(cls); this.load(); },
    });
  }

  resetForm() { this.form = { name: '', scheduled_at: '', duration_minutes: 60, max_capacity: 20, instructor_name: '', category: 'other', location: '' }; }

  saveClass() {
    this.api.post('/gym/classes', { ...this.form, property_id: this.auth.currentUser?.property_id || '' }).subscribe({
      next: () => { this.showForm = false; this.load(); },
    });
  }
}
