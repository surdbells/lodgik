import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        toast.error('Network error. Please check your connection.');
      } else if (error.status === 403) {
        toast.error('You do not have permission to perform this action.');
      } else if (error.status === 404) {
        // Don't toast 404s - let components handle them
      } else if (error.status === 422) {
        // Validation errors - let components handle them
      } else if (error.status === 429) {
        toast.warning('Too many requests. Please slow down.');
      } else if (error.status >= 500) {
        toast.error('Server error. Please try again later.');
      }

      return throwError(() => error);
    })
  );
};
