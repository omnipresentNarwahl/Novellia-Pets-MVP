import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MedicalRecord } from '../../models/medical-record';
import { Notifier } from '../../core/notifier';
import { RecordDialog, RecordDialogData } from './record-dialog';

describe('RecordDialog', () => {
  let fixture: ComponentFixture<RecordDialog>;
  let http: HttpTestingController;
  const close = vi.fn();
  const notifier = { success: vi.fn(), error: vi.fn() };

  type Internals = { form: RecordDialog['form']; submit(): void; minDate: Date | null };
  const dialog = () => fixture.componentInstance as unknown as Internals;

  const setup = async (data: RecordDialogData) => {
    await TestBed.configureTestingModule({
      imports: [RecordDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
        { provide: Notifier, useValue: notifier },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RecordDialog);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    close.mockReset();
    notifier.error.mockReset();
  });

  afterEach(() => http.verify());

  describe('adding', () => {
    beforeEach(() => setup({ petId: 'pet-1', petDateOfBirth: '2020-03-01' }));

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

  describe('editing', () => {
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

    beforeEach(() => setup({ petId: 'pet-1', petDateOfBirth: null, record }));

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
  });
});
