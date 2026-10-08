import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { MedicalRecord } from '../../models/medical-record';
import { Notifier } from '../../core/notifier';
import { RecordDialog, RecordDialogData } from './record-dialog';

describe('RecordDialog', () => {
  let fixture: ComponentFixture<RecordDialog>;
  let http: HttpTestingController;
  const close = vi.fn();
  const notifier = { success: vi.fn(), error: vi.fn() };
  const confirmResult = vi.fn(() => true);
  const matDialog = { open: vi.fn(() => ({ afterClosed: () => of(confirmResult()) })) };
  let backdropClick: Subject<MouseEvent>;
  let keydown: Subject<KeyboardEvent>;

  type Internals = {
    form: RecordDialog['form'];
    mode(): 'view' | 'edit';
    submit(): void;
    edit(): void;
    cancel(): void;
    delete(): void;
    minDate: Date | null;
  };
  const buttonLabels = () =>
    Array.from(fixture.nativeElement.querySelectorAll('mat-dialog-actions button') as NodeListOf<HTMLElement>).map((b) =>
      b.textContent!.replace(/^\s*(edit|delete)\s*/, '').trim(),
    );
  const inputCount = () => fixture.nativeElement.querySelectorAll('input, textarea, mat-select').length;
  const dialog = () => fixture.componentInstance as unknown as Internals;

  const setup = async (data: RecordDialogData) => {
    await TestBed.configureTestingModule({
      imports: [RecordDialog],
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
    fixture = TestBed.createComponent(RecordDialog);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    close.mockReset();
    notifier.error.mockReset();
    confirmResult.mockReset().mockReturnValue(true);
    matDialog.open.mockClear();
    backdropClick = new Subject();
    keydown = new Subject();
  });

  afterEach(() => http.verify());

  describe('adding', () => {
    beforeEach(() => setup({ petId: 'pet-1', petName: 'Biscuit', petDateOfBirth: '2020-03-01' }));

    it('defaults the date to today and limits the earliest date to the pet birth date', () => {
      const date = dialog().form.controls.recordDate.value!;
      expect(date.toDateString()).toBe(new Date().toDateString());
      expect(dialog().minDate?.toDateString()).toBe(new Date(2020, 2, 1).toDateString());
    });

    it('does not submit an incomplete form', () => {
      dialog().submit();
      http.expectNone('/api/pets/pet-1/records');
      expect(dialog().form.controls.type.touched).toBe(true);
      expect(dialog().form.controls.title.hasError('required')).toBe(true);
    });

    it('saves a trimmed payload and closes with a result of saved', () => {
      dialog().form.setValue({
        type: 'VACCINATION',
        title: '  Rabies booster ',
        recordDate: new Date(2024, 2, 1, 22, 0),
        provider: ' Maple Vet ',
        notes: '   ',
      });
      dialog().submit();

      const req = http.expectOne('/api/pets/pet-1/records');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        type: 'VACCINATION',
        title: 'Rabies booster',
        recordDate: '2024-03-01',
        provider: 'Maple Vet',
        notes: null,
      });
      req.flush({ id: 'r1' }, { status: 201, statusText: 'Created' });
      expect(close).toHaveBeenCalledWith('saved');
    });

    it('stays open and shows server errors on a 400', async () => {
      dialog().form.patchValue({ type: 'OTHER', title: 'x' });
      dialog().submit();
      http
        .expectOne('/api/pets/pet-1/records')
        .flush(
          { status: 400, message: 'Validation failed', errors: { recordDate: "must not be before the pet's date of birth (2020-03-01)" } },
          { status: 400, statusText: 'Bad Request' },
        );
      fixture.detectChanges();
      await fixture.whenStable();

      expect(close).not.toHaveBeenCalled();
      expect(dialog().form.controls.recordDate.hasError('server')).toBe(true);
      expect(fixture.nativeElement.textContent).toContain("Date must not be before the pet's date of birth");
      expect(dialog().form.controls.title.value).toBe('x');
    });

    it('closes with gone and tells the user when the pet no longer exists', () => {
      dialog().form.patchValue({ type: 'OTHER', title: 'x' });
      dialog().submit();
      http
        .expectOne('/api/pets/pet-1/records')
        .flush({ status: 404, message: 'Pet not found' }, { status: 404, statusText: 'Not Found' });

      expect(notifier.error).toHaveBeenCalledWith('This pet no longer exists.');
      expect(close).toHaveBeenCalledWith('gone');
    });
  });

  const record: MedicalRecord = {
    id: 'rec-9',
    petId: 'pet-1',
    type: 'MEDICATION',
    title: 'Antibiotic',
    recordDate: '2024-04-02',
    provider: null,
    notes: 'With food',
    createdAt: '2024-04-02T10:00:00Z',
  };

  describe('editing', () => {
    beforeEach(() => setup({ petId: 'pet-1', petName: 'Biscuit', petDateOfBirth: null, record, mode: 'edit' }));

    it('opens filled in and saves with a PUT to the record', () => {
      expect(dialog().form.getRawValue()).toMatchObject({ type: 'MEDICATION', title: 'Antibiotic', notes: 'With food' });
      expect(dialog().minDate).toBeNull();

      dialog().form.patchValue({ title: 'Antibiotic course' });
      dialog().submit();

      const req = http.expectOne('/api/pets/pet-1/records/rec-9');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toMatchObject({ title: 'Antibiotic course', recordDate: '2024-04-02', provider: null });
      req.flush({ ...record, title: 'Antibiotic course' });
      expect(close).toHaveBeenCalledWith('saved');
    });

    it('closes on a backdrop click or Escape without asking when nothing has changed', () => {
      backdropClick.next(new MouseEvent('click'));
      keydown.next(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(matDialog.open).not.toHaveBeenCalled();
      expect(close).toHaveBeenCalledTimes(2);
    });

    it('asks before a backdrop click discards changes', () => {
      dialog().form.controls.title.markAsDirty();

      confirmResult.mockReturnValue(false);
      backdropClick.next(new MouseEvent('click'));
      expect(matDialog.open).toHaveBeenCalledTimes(1);
      expect(close).not.toHaveBeenCalled();

      confirmResult.mockReturnValue(true);
      backdropClick.next(new MouseEvent('click'));
      expect(close).toHaveBeenCalledWith();
    });

    it('asks before Escape discards changes', () => {
      dialog().form.controls.title.markAsDirty();
      keydown.next(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(matDialog.open).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledWith();
    });

    it('closes on cancel', () => {
      dialog().cancel();
      expect(close).toHaveBeenCalledWith();
    });
  });

  describe('viewing', () => {
    beforeEach(() => setup({ petId: 'pet-1', petName: 'Biscuit', petDateOfBirth: null, record }));

    it('opens read only with edit and delete instead of cancel and save', () => {
      expect(dialog().mode()).toBe('view');
      expect(inputCount()).toBe(0);
      const text = fixture.nativeElement.querySelector('.details').textContent;
      expect(text).toContain('Medication');
      expect(text).toContain('Antibiotic');
      expect(text).toContain('April 2, 2024');
      expect(text).toContain('Not recorded');
      expect(text).toContain('With food');
      expect(buttonLabels()).toEqual(['Delete', 'Edit']);
      expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Biscuit');
    });

    it('switches to editing, and cancel returns to the read view with the original values', async () => {
      dialog().edit();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(inputCount()).toBe(5);
      expect(buttonLabels()).toEqual(['Cancel', 'Save']);
      expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Biscuit');

      dialog().form.patchValue({ title: 'Changed' });
      dialog().cancel();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(close).not.toHaveBeenCalled();
      expect(dialog().mode()).toBe('view');
      expect(inputCount()).toBe(0);
      expect(dialog().form.getRawValue().title).toBe('Antibiotic');
      expect(dialog().form.getRawValue().recordDate!.toDateString()).toBe(new Date(2024, 3, 2).toDateString());
    });

    it('deletes after confirmation and closes with deleted', () => {
      dialog().delete();
      const req = http.expectOne('/api/pets/pet-1/records/rec-9');
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      expect(close).toHaveBeenCalledWith('deleted');
    });

    it('does nothing when the deletion is not confirmed', () => {
      confirmResult.mockReturnValue(false);
      dialog().delete();
      http.expectNone('/api/pets/pet-1/records/rec-9');
      expect(close).not.toHaveBeenCalled();
    });
  });
});
