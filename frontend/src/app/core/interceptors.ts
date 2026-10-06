import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';
import { LoadingService } from './loading.service';
import { Notifier } from './notifier';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};

/** Shows a snackbar for network failures and 5xx. 400 and 404 are left to the pages. */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(Notifier);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        notifier.error('Cannot reach the server. Check your connection and try again.');
      } else if (error.status >= 500) {
        notifier.error('The server ran into a problem. Please try again.');
      }
      return throwError(() => error);
    }),
  );
};
