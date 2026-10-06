import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { applyServerErrors, errorMessage } from './form-errors';

function badRequest(body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status: 400, error: body });
}

describe('applyServerErrors', () => {
  const makeForm = () =>
    new FormGroup({
      name: new FormControl(''),
      recordDate: new FormControl(''),
    });

  it('sets a server error on each matching control and marks it touched', () => {
    const form = makeForm();
    const banner = applyServerErrors(
      form,
      badRequest({ status: 400, message: 'Validation failed', errors: { name: 'must not be blank' } }),
    );
    expect(banner).toBeNull();
    expect(form.controls.name.errors).toEqual({ server: 'must not be blank' });
    expect(form.controls.name.touched).toBe(true);
    expect(form.controls.recordDate.errors).toBeNull();
  });

  it('returns the messages that match no control for a banner', () => {
    const form = makeForm();
    const banner = applyServerErrors(
      form,
      badRequest({ status: 400, message: 'Validation failed', errors: { name: 'bad', sort: 'must be one of: name' } }),
    );
    expect(banner).toBe('sort must be one of: name');
    expect(form.controls.name.errors).toEqual({ server: 'bad' });
  });

  it('falls back to the message when there is no errors object', () => {
    expect(applyServerErrors(makeForm(), badRequest({ status: 400, message: 'Malformed request body' }))).toBe(
      'Malformed request body',
    );
  });

  it('leaves other statuses to the interceptor and the pages', () => {
    const form = makeForm();
    expect(applyServerErrors(form, new HttpErrorResponse({ status: 500 }))).toBeNull();
    expect(applyServerErrors(form, new HttpErrorResponse({ status: 404 }))).toBeNull();
    expect(applyServerErrors(form, new Error('boom'))).toBeNull();
    expect(form.valid).toBe(true);
  });

  it('clears the server error once the user edits the field', () => {
    const form = new FormGroup({ name: new FormControl('', Validators.required) });
    applyServerErrors(form, badRequest({ errors: { name: 'must not be blank' } }));
    expect(form.controls.name.hasError('server')).toBe(true);
    form.controls.name.setValue('Rex');
    expect(form.controls.name.hasError('server')).toBe(false);
  });
});

describe('errorMessage', () => {
  it('is null for a valid control', () => {
    expect(errorMessage(new FormControl('x'), 'Name')).toBeNull();
    expect(errorMessage(null, 'Name')).toBeNull();
  });

  it('describes the common errors with the field label', () => {
    expect(errorMessage(new FormControl('', Validators.required), 'Name')).toBe('Name is required');
    expect(errorMessage(new FormControl('abcd', Validators.maxLength(3)), 'Name')).toBe(
      'Name must be at most 3 characters',
    );
  });

  it('puts the server message after the label', () => {
    const control = new FormControl('');
    control.setErrors({ server: 'must not be in the future' });
    expect(errorMessage(control, 'Date')).toBe('Date must not be in the future');
  });
});
