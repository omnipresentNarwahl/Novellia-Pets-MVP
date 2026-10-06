import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Router, provideRouter } from '@angular/router';
import { PetFormPage } from './pet-form.page';

describe('PetFormPage', () => {
  let fixture: ComponentFixture<PetFormPage>;
  let http: HttpTestingController;
  let router: Router;

  // The form is protected in the component, so reach it the way a template would.
  const page = () => fixture.componentInstance as unknown as { form: PetFormPage['form']; submit(): void };
  const el = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetFormPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNativeDateAdapter()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PetFormPage);
    await render();
  });

  afterEach(() => http.verify());

  it('requires a name and a species before submitting', async () => {
    page().submit();
    await render();
    http.expectNone('/api/pets');
    expect(el('mat-error')?.textContent).toContain('Name is required');
    expect(fixture.nativeElement.textContent).toContain('Species is required');
  });

  it('treats a name of only spaces as missing', async () => {
    page().form.patchValue({ name: '   ', species: 'DOG' });
    page().submit();
    await render();
    http.expectNone('/api/pets');
    expect(page().form.controls.name.hasError('required')).toBe(true);
  });

  it('shows the Other species field only for Other, and requires it then', async () => {
    expect(el('input[formcontrolname=speciesOther]')).toBeNull();

    page().form.patchValue({ name: 'Zed', species: 'OTHER' });
    await render();
    expect(el('input[formcontrolname=speciesOther]')).not.toBeNull();
    expect(page().form.controls.speciesOther.hasError('required')).toBe(true);

    page().submit();
    await render();
    http.expectNone('/api/pets');
    expect(fixture.nativeElement.textContent).toContain('Kind of animal is required');

    page().form.patchValue({ speciesOther: '   ' });
    expect(page().form.controls.speciesOther.hasError('required')).toBe(true);

    page().form.patchValue({ speciesOther: 'Ferret' });
    expect(page().form.valid).toBe(true);
  });

  it('clears the description and stops requiring it when the species changes away from Other', async () => {
    page().form.patchValue({ name: 'Zed', species: 'OTHER', speciesOther: 'Ferret' });
    await render();
    page().form.patchValue({ species: 'DOG' });
    await render();

    expect(page().form.controls.speciesOther.value).toBe('');
    expect(el('input[formcontrolname=speciesOther]')).toBeNull();
    // Regression: the field's own required directive used to stay attached and block saving.
    expect(page().form.valid).toBe(true);
  });

  it('sends a trimmed payload with nulls for empty optionals and a local yyyy-MM-dd birth date', async () => {
    page().form.setValue({
      name: '  Biscuit ',
      species: 'DOG',
      speciesOther: '',
      breed: '  ',
      dateOfBirth: new Date(2020, 4, 1, 23, 45),
      notes: '',
    });
    page().submit();

    const req = http.expectOne('/api/pets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Biscuit',
      species: 'DOG',
      speciesOther: null,
      breed: null,
      dateOfBirth: '2020-05-01',
      notes: null,
    });
    req.flush({ id: 'abc', name: 'Biscuit' }, { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/pets', 'abc']);
  });

  it('sends the description for Other', async () => {
    page().form.patchValue({ name: 'Zed', species: 'OTHER', speciesOther: ' Ferret ' });
    page().submit();
    const req = http.expectOne('/api/pets');
    expect(req.request.body).toMatchObject({ species: 'OTHER', speciesOther: 'Ferret' });
    req.flush({ id: 'z' }, { status: 201, statusText: 'Created' });
  });

  it('keeps the input and shows server field errors on a 400', async () => {
    page().form.patchValue({ name: 'Biscuit', species: 'DOG', dateOfBirth: new Date(2020, 0, 1) });
    page().submit();
    http
      .expectOne('/api/pets')
      .flush(
        { status: 400, message: 'Validation failed', errors: { name: 'must not be blank', sort: 'odd' } },
        { status: 400, statusText: 'Bad Request' },
      );
    await render();

    expect(page().form.controls.name.hasError('server')).toBe(true);
    expect(page().form.controls.name.value).toBe('Biscuit');
    expect(fixture.nativeElement.textContent).toContain('Name must not be blank');
    expect(el('.form-banner')?.textContent).toContain('sort odd');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
