import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, StatsCardComponent, ActivePropertyService } from '@lodgik/shared';

const APP_STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-50 text-blue-700', screened: 'bg-purple-50 text-purple-700',
  interview_scheduled: 'bg-amber-50 text-amber-700', interview_done: 'bg-orange-50 text-orange-700',
  offer_made: 'bg-sage-50 text-sage-700', hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700', withdrawn: 'bg-gray-100 text-gray-500',
};
const JOB_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500', open: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700', closed: 'bg-red-50 text-red-700', filled: 'bg-blue-50 text-blue-700',
};

@Component({
  selector: 'app-recruitment',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
<ui-page-header title="Recruitment" icon="briefcase" subtitle="Job openings and applicant tracking" [breadcrumbs]="['HR', 'Recruitment']">
  <button (click)="openAddJob()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">+ New Opening</button>
</ui-page-header>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
  <ui-stats-card label="Open Positions" [value]="openOpenings()" icon="briefcase"></ui-stats-card>
  <ui-stats-card label="Total Applicants" [value]="totalApplicants()" icon="users"></ui-stats-card>
  <ui-stats-card label="Interviews Scheduled" [value]="interviewCount()" icon="calendar"></ui-stats-card>
  <ui-stats-card label="Hired This Month" [value]="hiredCount()" icon="circle-check"></ui-stats-card>
</div>

<div class="flex gap-5">
  <!-- Job openings list -->
  <div class="w-64 flex-shrink-0 space-y-2">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Openings</p>
    @for (j of openings(); track j.id) {
      <button (click)="selectJob(j)" class="w-full text-left p-3 rounded-xl border transition-all"
        [class]="selectedJob()?.id === j.id ? 'border-sage-300 bg-sage-50' : 'border-gray-100 bg-white hover:border-gray-200'">
        <p class="text-sm font-medium text-gray-800 truncate">{{ j.title }}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full" [class]="statusColor(j.status)">{{ j.status }}</span>
          <span class="text-xs text-gray-400">{{ j.vacancies }} spot{{ j.vacancies !== 1 ? 's' : '' }}</span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">{{ j.application_count ?? 0 }} applicants</p>
      </button>
    } @empty {
      <p class="text-sm text-gray-400 text-center py-6">No job openings yet</p>
    }
  </div>

  <!-- Applications board -->
  <div class="flex-1 min-w-0">
    @if (!selectedJob()) {
      <div class="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
        <p class="text-sm text-gray-400">Select a job opening to view applicants</p>
      </div>
    } @else {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card">
        <div class="flex items-center gap-3 p-4 border-b">
          <div class="flex-1">
            <h3 class="text-base font-semibold text-gray-800">{{ selectedJob()!.title }}</h3>
            <p class="text-xs text-gray-400">{{ selectedJob()!.employment_type }} · {{ selectedJob()!.vacancies }} vacancy · Deadline: {{ selectedJob()!.deadline | date:'dd MMM yyyy' }}</p>
          </div>
          <button (click)="openAddApp()" class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">+ Add Applicant</button>
        </div>

        <!-- Kanban columns -->
        <div class="overflow-x-auto">
          <div class="flex gap-3 p-4 min-w-max">
            @for (stage of stages; track stage.value) {
              <div class="w-52 flex-shrink-0">
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="stage.color">{{ stage.label }}</span>
                  <span class="text-xs text-gray-400">({{ appsForStage(stage.value).length }})</span>
                </div>
                <div class="space-y-2 min-h-[80px]">
                  @for (app of appsForStage(stage.value); track app.id) {
                    <div class="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      <p class="text-sm font-medium text-gray-800 truncate">{{ app.applicant_name }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ app.applicant_email }}</p>
                      @if (app.interview_date) {
                        <p class="text-[11px] text-amber-600 mt-1">📅 {{ app.interview_date | date:'dd MMM HH:mm' }}</p>
                      }
                      <div class="flex gap-1 mt-2">
                        @for (next of nextStages(app.status); track next) {
                          <button (click)="advanceApp(app, next)" class="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-sage-100 text-gray-600 rounded">→ {{ fmtStage(next) }}</button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  </div>
</div>

<!-- Add Job Modal -->
@if (showAddJob) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAddJob=false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">New Job Opening</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Job Title *</label>
          <input [(ngModel)]="jobForm.title" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Employment Type</label>
          <select [(ngModel)]="jobForm.employment_type" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="permanent">Permanent</option><option value="contract">Contract</option>
            <option value="ad_hoc">Ad Hoc</option><option value="intern">Intern</option>
          </select></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Vacancies</label>
          <input [(ngModel)]="jobForm.vacancies" type="number" min="1" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Salary Min (₦/mo)</label>
          <input [(ngModel)]="jobForm.salary_min" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Salary Max (₦/mo)</label>
          <input [(ngModel)]="jobForm.salary_max" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Application Deadline</label>
          <input [(ngModel)]="jobForm.deadline" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Status</label>
          <select [(ngModel)]="jobForm.status" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="open">Open</option><option value="draft">Draft</option>
          </select></div>
        <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea [(ngModel)]="jobForm.description" rows="3" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
        <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Requirements</label>
          <textarea [(ngModel)]="jobForm.requirements" rows="3" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showAddJob=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="submitJob()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Create</button>
      </div>
    </div>
  </div>
}

<!-- Add Applicant Modal -->
@if (showAddApp) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAddApp=false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">Add Applicant — {{ selectedJob()?.title }}</h3>
      <div class="space-y-3">
        <div><label class="text-xs text-gray-500 mb-1 block">Name *</label>
          <input [(ngModel)]="appForm.applicant_name" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Email</label>
          <input [(ngModel)]="appForm.applicant_email" type="email" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Phone</label>
          <input [(ngModel)]="appForm.applicant_phone" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Cover Note</label>
          <textarea [(ngModel)]="appForm.cover_note" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showAddApp=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="submitApp()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Add</button>
      </div>
    </div>
  </div>
}
  `,
})
export class RecruitmentPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true);
  openings = signal<any[]>([]);
  selectedJob = signal<any>(null);
  applications = signal<any[]>([]);
  showAddJob = false; showAddApp = false;
  jobForm: any = { title:'', employment_type:'permanent', vacancies:1, deadline:'', description:'', requirements:'', status:'open', salary_min:'', salary_max:'' };
  appForm: any = { applicant_name:'', applicant_email:'', applicant_phone:'', cover_note:'' };

  readonly openOpenings = computed(() => this.openings().filter(j => j.status === 'open').length);
  readonly stages = [
    { value:'applied', label:'Applied', color:'bg-blue-50 text-blue-700' },
    { value:'screened', label:'Screened', color:'bg-purple-50 text-purple-700' },
    { value:'interview_scheduled', label:'Interview', color:'bg-amber-50 text-amber-700' },
    { value:'offer_made', label:'Offer Made', color:'bg-sage-50 text-sage-700' },
    { value:'hired', label:'Hired', color:'bg-emerald-50 text-emerald-700' },
  ];

  readonly NEXT: Record<string, string[]> = {
    applied: ['screened','rejected'],
    screened: ['interview_scheduled','rejected'],
    interview_scheduled: ['interview_done','rejected'],
    interview_done: ['offer_made','rejected'],
    offer_made: ['hired','rejected'],
    hired: [], rejected: [],
  };

  totalApplicants = () => this.openings().reduce((s,j)=>s+(j.application_count??0),0);
  interviewCount = () => this.applications().filter(a=>a.status==='interview_scheduled').length;
  hiredCount = () => this.applications().filter(a=>a.status==='hired').length;

  ngOnInit() { this.loadOpenings(); }
  loadOpenings() {
    this.loading.set(true);
    this.api.get('/hr/job-openings').subscribe({ next: (r:any) => { this.openings.set(r.data??[]); this.loading.set(false); }, error: ()=>this.loading.set(false) });
  }
  selectJob(j: any) {
    this.selectedJob.set(j);
    this.api.get(`/hr/job-openings/${j.id}/applications`).subscribe((r:any)=>this.applications.set(r.data??[]));
  }
  appsForStage(status: string): any[] { return this.applications().filter(a=>a.status===status); }
  statusColor(s: string): string { return JOB_STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-500'; }
  nextStages(s: string): string[] { return (this.NEXT[s]??[]).slice(0,2); }
  fmtStage(s: string): string { return s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }

  openAddJob() { this.jobForm = { title:'', employment_type:'permanent', vacancies:1, deadline:'', description:'', requirements:'', status:'open', salary_min:'', salary_max:'' }; this.showAddJob=true; }
  submitJob() {
    if (!this.jobForm.title) { this.toast.error('Title required'); return; }
    this.api.post('/hr/job-openings', this.jobForm).subscribe((r:any)=>{ if(r.success){this.toast.success('Job created');this.showAddJob=false;this.loadOpenings();}else this.toast.error(r.message||'Failed'); });
  }
  openAddApp() { this.appForm = { applicant_name:'', applicant_email:'', applicant_phone:'', cover_note:'' }; this.showAddApp=true; }
  submitApp() {
    if (!this.appForm.applicant_name) { this.toast.error('Name required'); return; }
    const jid = this.selectedJob()!.id;
    this.api.post(`/hr/job-openings/${jid}/applications`, this.appForm).subscribe((r:any)=>{ if(r.success){this.toast.success('Applicant added');this.showAddApp=false;this.selectJob(this.selectedJob()!);}else this.toast.error(r.message||'Failed'); });
  }
  advanceApp(app: any, status: string) {
    this.api.patch(`/hr/job-openings/${this.selectedJob()!.id}/applications/${app.id}`, { status }).subscribe((r:any)=>{ if(r.success)this.selectJob(this.selectedJob()!); });
  }
}
