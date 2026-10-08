import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { Notifier } from '../../core/notifier';
import { Pet } from '../../models/pet';
import { PetDialog, PetDialogData } from './pet-dialog';

describe('PetDialog', () => {
  let fixture: ComponentFixture<PetDialog>;
  let http: HttpTestingController;
  const close = vi.fn();
  const notifier = { success: vi.fn(), error: vi.fn() };
  const confirmResult = vi.fn(() => true);
  const matDialog = { open: vi.fn(() => ({ afterClosed: () => of(confirmResult()) })) };
  let backdropClick: Subject<MouseEvent>;
  let keydown: Subject<KeyboardEvent>;

  // The form is protected in the component, so reach it the way a template would.
  const page = () => fixture.componentInstance as unknown as { form: PetDialog['form']; submit(): void };
  const el = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const setup = async (data: PetDialogData) => {
    await TestBed.configureTestingModule({
      imports: [PetDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        {
          provide: MatDialogRef,
          useValue: { close, disableClose: false, backdropClick: () => backdropClick, keydownEvents: () => keydown },
        },
        { provide: Notifier, useValue: notifier },
      ],
    })
      // The component imports MatDialogModule, which would otherwise shadow a plain provider.
      .overrideProvider(MatDialog, { useValue: matDialog })
      .compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PetDialog);
    await render();
  };

  beforeEach(async () => {
    close.mockReset();
    notifier.error.mockReset();
    confirmResult.mockReset().mockReturnValue(true);
    matDialog.open.mockClear();
    backdropClick = new Subject();
    keydown = new Subject();
    await setup({});
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
    expect(close).toHaveBeenCalledWith({ id: 'abc', name: 'Biscuit' });
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
    expect(close).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click without asking when nothing has changed', () => {
    backdropClick.next(new MouseEvent('click'));
    expect(matDialog.open).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith();
  });

  it('asks before a backdrop click or Escape discards changes', () => {
    page().form.controls.name.markAsDirty();

    confirmResult.mockReturnValue(false);
    backdropClick.next(new MouseEvent('click'));
    keydown.next(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(matDialog.open).toHaveBeenCalledTimes(2);
    expect(close).not.toHaveBeenCalled();

    confirmResult.mockReturnValue(true);
    backdropClick.next(new MouseEvent('click'));
    expect(close).toHaveBeenCalledWith();
  });
});

describe('PetDialog editing', () => {
  const pet: Pet = {
    id: 'pet-7',
    name: 'Zed',
    species: 'OTHER',
    speciesOther: 'Ferret',
    breed: null,
    dateOfBirth: '2021-06-15',
    notes: 'Likes tunnels',
    recordCount: 2,
    lastRecordDate: null,
    createdAt: '2024-01-01T00:00:00Z',
  };
  const close = vi.fn();
  const notifier = { success: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<PetDialog>;
  let http: HttpTestingController;
  const page = () => fixture.componentInstance as unknown as { form: PetDialog['form']; submit(): void };

  beforeEach(async () => {
    close.mockReset();
    await TestBed.configureTestingModule({
      imports: [PetDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: { pet } },
        {
          provide: MatDialogRef,
          useValue: { close, disableClose: false, backdropClick: () => new Subject(), keydownEvents: () => new Subject() },
        },
        { provide: Notifier, useValue: notifier },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PetDialog);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('opens filled in, including the Other description, and saves with a PUT', () => {
    expect(page().form.getRawValue()).toMatchObject({ name: 'Zed', species: 'OTHER', speciesOther: 'Ferret', breed: '' });
    expect(page().form.controls.dateOfBirth.value?.toDateString()).toBe(new Date(2021, 5, 15).toDateString());
    expect(fixture.nativeElement.querySelector('input[formcontrolname=speciesOther]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Edit Zed');

    page().form.patchValue({ name: 'Zed II' });
    page().submit();

    const req = http.expectOne('/api/pets/pet-7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ name: 'Zed II', speciesOther: 'Ferret', dateOfBirth: '2021-06-15' });
    req.flush({ ...pet, name: 'Zed II' });
    expect(close).toHaveBeenCalledWith({ ...pet, name: 'Zed II' });
  });

  it('closes with gone and tells the user when the pet no longer exists', () => {
    page().submit();
    http.expectOne('/api/pets/pet-7').flush({ status: 404, message: 'Pet not found' }, { status: 404, statusText: 'Not Found' });
    expect(notifier.error).toHaveBeenCalledWith('This pet no longer exists.');
    expect(close).toHaveBeenCalledWith('gone');
  });
});
