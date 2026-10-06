import { AbstractControl, FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../models/api-error';

/**
 * Maps a 400 response's field errors onto the matching form controls as a `server` error.
 * Returns a banner message for anything that matches no control, or null when nothing is left over.
 * Other statuses are handled elsewhere (the interceptor and the pages), so they return null.
 */
export function applyServerErrors(form: FormGroup, error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return null;
  }
  const body = error.error as Partial<ApiError> | null;
  const errors = body?.errors;
  if (!errors || Object.keys(errors).length === 0) {
    return body?.message ?? 'The request was not valid.';
  }
  const unmatched: string[] = [];
  for (const [field, message] of Object.entries(errors)) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    } else {
      unmatched.push(`${field} ${message}`);
    }
  }
  return unmatched.length > 0 ? unmatched.join('. ') : null;
}

/** The text to show under a field, or null when it has no error. */
export function errorMessage(control: AbstractControl | null, label: string): string | null {
  const errors = control?.errors;
  if (!errors) {
    return null;
  }
  if (errors['server']) {
    return `${label} ${errors['server']}`;
  }
  if (errors['required']) {
    return `${label} is required`;
  }
  if (errors['maxlength']) {
    return `${label} must be at most ${errors['maxlength'].requiredLength} characters`;
  }
  if (errors['matDatepickerMax']) {
    return `${label} cannot be in the future`;
  }
  if (errors['matDatepickerMin']) {
    return `${label} is earlier than allowed`;
  }
  if (errors['matDatepickerParse']) {
    return 'Enter a valid date';
  }
  return `${label} is not valid`;
}
