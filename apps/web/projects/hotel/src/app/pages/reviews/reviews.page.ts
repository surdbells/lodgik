import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Performance Reviews" subtitle="Staff evaluations and ratings"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    <div class="bg-white rounded-lg border overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Employee</th><th class="px-4 py-3 text-left font-medium text-gray-600">Reviewer</th>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Period</th><th class="px-4 py-3 text-center font-medium text-gray-600">Rating</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
        </tr></thead>
        <tbody>
          @for (r of reviews(); track r.id) {
            <tr class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{r.employee_name}}</td><td class="px-4 py-3">{{r.reviewer_name}}</td>
              <td class="px-4 py-3">{{r.review_period}}</td>
              <td class="px-4 py-3 text-center"><span class="text-yellow-500">{{ '★'.repeat(r.overall_rating || 0) }}{{ '☆'.repeat(5 - (r.overall_rating || 0)) }}</span></td>
              <td class="px-4 py-3 text-center"><span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + (r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')">{{r.status}}</span></td>
            </tr>
          } @empty { <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No reviews found</td></tr> }
        </tbody>
      </table>
    </div>
  `
})
export default class ReviewsPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); reviews = signal<any[]>([]);
  ngOnInit() { this.api.get('/finance/performance-reviews').subscribe((r: any) => { this.reviews.set(r?.data || []); this.loading.set(false); }); }
}
