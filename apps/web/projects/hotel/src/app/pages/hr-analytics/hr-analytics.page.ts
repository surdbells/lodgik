import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService } from '@lodgik/shared';

const PALETTE = ['#4A7A4A','#2563EB','#D97706','#DC2626','#7C3AED','#059669','#DB2777'];
const W=480, H=180, PAD={t:20,r:16,b:36,l:52};
const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;

function bars(items:{label:string,value:number}[],color=PALETTE[0]) {
  const max=Math.max(...items.map(i=>i.value),0.01);
  const n=items.length, bw=(PW/Math.max(n,1))*0.65;
  return items.map((it,i)=>({
    x: PAD.l + i*(PW/Math.max(n,1)) + (PW/Math.max(n,1))*0.175,
    y: PAD.t + PH - (it.value/max)*PH, w: bw, h: (it.value/max)*PH, label:it.label, value:it.value, color,
  }));
}
function linePoints(items:{label:string,value:number}[]) {
  const max=Math.max(...items.map(i=>i.value),0.01);
  const n=items.length;
  return items.map((it,i)=>({
    x: PAD.l+(n<2?PW/2:(i/(n-1))*PW), y: PAD.t+PH-(it.value/max)*PH, label:it.label, value:it.value,
  }));
}
function linePath(pts:{x:number,y:number}[]) { if(!pts.length)return''; return'M'+pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L'); }
function donutSlices(items:{label:string,value:number}[]) {
  const total=items.reduce((s,i)=>s+i.value,0)||1;
  let a=-Math.PI/2;
  return items.map((it,i)=>{
    const span=(it.value/total)*2*Math.PI, a1=a, a2=a+span; a+=span;
    const ro=70,ri=42,cx=90,cy=90,lg=(span>Math.PI?1:0);
    const ox1=cx+ro*Math.cos(a1),oy1=cy+ro*Math.sin(a1);
    const ox2=cx+ro*Math.cos(a2),oy2=cy+ro*Math.sin(a2);
    const ix1=cx+ri*Math.cos(a2),iy1=cy+ri*Math.sin(a2);
    const ix2=cx+ri*Math.cos(a1),iy2=cy+ri*Math.sin(a1);
    return { d:`M${ox1},${oy1}A${ro},${ro},0,${lg},1,${ox2},${oy2}L${ix1},${iy1}A${ri},${ri},0,${lg},0,${ix2},${iy2}Z`, color:PALETTE[i%PALETTE.length], label:it.label, value:it.value, pct:Math.round(it.value/total*100) };
  });
}

@Component({
  selector: 'app-hr-analytics',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
<ui-page-header title="HR Analytics" icon="chart-bar" subtitle="Workforce insights and trends" [breadcrumbs]="['HR', 'Analytics']"></ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading() && data()) {
  <!-- KPI row -->
  <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
    <ui-stats-card label="Total Employees"     [value]="'' + data()!.total_employees"        icon="users"></ui-stats-card>
    <ui-stats-card label="Turnover Rate"        [value]="data()!.turnover_rate_pct + '%'" icon="trending-down"></ui-stats-card>
    <ui-stats-card label="Terminated (YTD)"     [value]="'' + data()!.terminated_this_year"   icon="circle-x"></ui-stats-card>
    <ui-stats-card label="Expiring Contracts"   [value]="'' + data()!.expiring_contracts"     icon="triangle-alert"></ui-stats-card>
    <ui-stats-card label="Pending Expense Claims" [value]="'' + data()!.pending_expense_claims" icon="receipt"></ui-stats-card>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
    <!-- Headcount by type -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Headcount by Employment Type</h3>
      <div class="flex items-center gap-6">
        <svg viewBox="0 0 180 180" class="w-36 h-36 flex-shrink-0">
          @for (s of typeSlices(); track $index) {
            <path [attr.d]="s.d" [attr.fill]="s.color" stroke="white" stroke-width="2"/>
          }
          <text x="90" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="#1E293B">{{ data()!.total_employees }}</text>
          <text x="90" y="102" text-anchor="middle" font-size="9" fill="#9CA3AF">Total</text>
        </svg>
        <div class="space-y-1.5 flex-1">
          @for (s of typeSlices(); track $index) {
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" [style.background]="s.color"></span>
              <span class="text-xs text-gray-600 flex-1 truncate">{{ s.label }}</span>
              <span class="text-xs font-medium">{{ s.pct }}%</span>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Headcount by dept -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Headcount by Department</h3>
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="w-full">
        @for (i of [0,1,2,3]; track i) {
          <line [attr.x1]="PAD_L" [attr.x2]="W-PAD_R"
            [attr.y1]="PAD_T + (PH*i/3)" [attr.y2]="PAD_T + (PH*i/3)" stroke="#F3F4F6" stroke-width="1"/>
        }
        @for (b of deptBars(); track $index) {
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [attr.fill]="b.color" rx="2"/>
          <text [attr.x]="b.x+b.w/2" [attr.y]="H-4" text-anchor="middle" font-size="9" fill="#9CA3AF">{{ b.label.slice(0,8) }}</text>
        }
      </svg>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
    <!-- Attendance trend -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Attendance Rate (30 days)</h3>
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="w-full">
        @for (i of [0,1,2,3,4]; track i) {
          <line [attr.x1]="PAD_L" [attr.x2]="W-PAD_R"
            [attr.y1]="PAD_T + (PH*i/4)" [attr.y2]="PAD_T + (PH*i/4)" stroke="#F3F4F6" stroke-width="1"/>
          <text [attr.x]="PAD_L-6" [attr.y]="PAD_T + (PH*i/4) + 4" text-anchor="end" font-size="9" fill="#9CA3AF">
            {{ (100 - i*25) + "%" }}
          </text>
        }
        @if (attendanceLine().length > 1) {
          <path [attr.d]="attendanceAreaPath()" fill="#4A7A4A" fill-opacity="0.1"/>
          <path [attr.d]="attendanceLinePath()" fill="none" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
        }
        @for (pt of attendanceLine(); track $index; let i = $index) {
          @if (i % 7 === 0) {
            <text [attr.x]="pt.x" [attr.y]="H-4" text-anchor="middle" font-size="9" fill="#9CA3AF">{{ pt.label }}</text>
          }
        }
      </svg>
    </div>

    <!-- Leave distribution -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Leave by Type (This Year)</h3>
      <div class="flex items-center gap-4">
        <svg viewBox="0 0 180 180" class="w-32 h-32 flex-shrink-0">
          @for (s of leaveSlices(); track $index) {
            <path [attr.d]="s.d" [attr.fill]="s.color" stroke="white" stroke-width="2"/>
          }
        </svg>
        <div class="space-y-1.5 flex-1">
          @for (s of leaveSlices(); track $index) {
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-sm" [style.background]="s.color"></span>
              <span class="text-xs text-gray-600 flex-1 truncate">{{ s.label }}</span>
              <span class="text-xs font-medium text-gray-500">{{ s.value }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  </div>

  <!-- Payroll trend -->
  <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
    <h3 class="text-sm font-semibold text-gray-700 mb-4">Monthly Payroll Cost (₦)</h3>
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="w-full">
      @for (i of [0,1,2,3,4]; track i) {
        <line [attr.x1]="PAD_L" [attr.x2]="W-PAD_R"
          [attr.y1]="PAD_T + (PH*i/4)" [attr.y2]="PAD_T + (PH*i/4)" stroke="#F3F4F6" stroke-width="1"/>
      }
      @for (b of payrollBars(); track $index) {
        <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [attr.fill]="b.color" rx="2"/>
        <text [attr.x]="b.x+b.w/2" [attr.y]="H-4" text-anchor="middle" font-size="9" fill="#9CA3AF">{{ b.label }}</text>
      }
    </svg>
  </div>
}
  `,
})
export class HrAnalyticsPage implements OnInit {
  private api = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true);
  data = signal<any>(null);

  readonly W=W; readonly H=H; readonly PAD_L=PAD.l; readonly PAD_R=PAD.r; readonly PAD_T=PAD.t; readonly PH=PH;

  typeSlices  = computed(() => donutSlices((this.data()?.headcount_by_type??[]).map((r:any)=>({label:r.employment_type,value:+r.count}))));
  deptBars    = computed(() => bars((this.data()?.headcount_by_dept??[]).slice(0,8).map((r:any)=>({label:r.department??'—',value:+r.count})),PALETTE[1]));
  payrollBars = computed(() => bars((this.data()?.payroll_cost_trend??[]).map((r:any)=>({label:r.month.slice(5),value:+(r.total_gross)/100})),PALETTE[0]));
  leaveSlices = computed(() => donutSlices((this.data()?.leave_by_type??[]).map((r:any)=>({label:r.leave_type,value:+r.count}))));

  attendanceLine = computed((): {x:number,y:number,label:string,value:number}[] => {
    const d: any[] = this.data()?.attendance_trend??[];
    return linePoints(d.map((r:any)=>({label:(r.date??'').slice(5),value:r.total>0?Math.round(r.present/r.total*100):0})));
  });

  attendanceLinePath = computed(() => linePath(this.attendanceLine()));
  attendanceAreaPath = computed(() => {
    const pts = this.attendanceLine(); if(!pts.length) return '';
    const base = PAD.t+PH;
    return linePath(pts) + `L${pts[pts.length-1].x},${base}L${pts[0].x},${base}Z`;
  });

  ngOnInit() { this.load(); }
  load() {
    this.api.get('/hr/analytics').subscribe({ next:(r:any)=>{ this.data.set(r.data); this.loading.set(false); }, error:()=>this.loading.set(false) });
  }
}
