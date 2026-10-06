import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MAT_DIALOG_DATA, MatDialogConfig, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { parseIsoDate, toIsoDate, today } from '../../core/dates';
import { applyServerErrors, errorMessage } from '../../core/form-errors';
import { Notifier } from '../../core/notifier';
import { nullIfBlank } from '../../core/strings';
import { notBlank } from '../../core/validators';
import { MedicalRecord, RecordRequest } from '../../models/medical-record';
import { RECORD_TYPES, RECORD_TYPE_LABELS, RecordType } from '../../models/record-type';
import { RecordService } from './record.service';

export interface RecordDialogData {
  petId: string;
  petDateOfBirth: string | null;
  /** Present when editing. */
  record?: MedicalRecord;
}

/** `saved` means reload; `gone` means the pet or record disappeared (for example deleted in another tab). */
export type RecordDialogResult = 'saved' | 'gone';

/** A centered 480px modal, or full screen on phones. */
export function recordDialogConfig(
  breakpoints: BreakpointObserver,
  data: RecordDialogData,
): MatDialogConfig<RecordDialogData> {
  const phone = breakpoints.isMatched('(max-width: 599.98px)');
  return {
    data,
    width: phone ? '100vw' : '480px',
    maxWidth: '100vw',
    height: phone ? '100vh' : undefined,
    maxHeight: phone ? '100vh' : undefined,
    panelClass: 'record-dialog-panel',
  };
}

@Component({
  selector: 'app-record-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './record-dialog.html',
  styleUrl: './record-dialog.scss',
})
export class RecordDialog {
  private readonly data = inject<RecordDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RecordDialog, RecordDialogResult>>(MatDialogRef);
  private readonly recordService = inject(RecordService);
  private readonly notifier = inject(Notifier);

  protected readonly typeOptions = RECORD_TYPES;
  protected readonly typeLabels = RECORD_TYPE_LABELS;
  protected readonly isEdit = !!this.data.record;
  protected readonly maxDate = today();
  protected readonly minDate = this.data.petDateOfBirth ? parseIsoDate(this.data.petDateOfBirth) : null;

  protected readonly saving = signal(false);
  protected readonly banner = signal<string | null>(null);

  protected readonly form = new FormGroup({
    type: new FormControl<RecordType | null>(this.data.record?.type ?? null, [Validators.required]),
    title: new FormControl(this.data.record?.title ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(150)],
    }),
    recordDate: new FormControl<Date | null>(
      this.data.record ? parseIsoDate(this.data.record.recordDate) : today(),
      [Validators.required],
    ),
    provider: new FormControl(this.data.record?.provider ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    notes: new FormControl(this.data.record?.notes ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(4000)],
    }),
  });

  protected readonly error = (name: keyof typeof this.form.controls, label: string) =>
    errorMessage(this.form.controls[name], label);

  protected submit(): void {
    this.banner.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: RecordRequest = {
      type: value.type!,
      title: value.title.trim(),
      recordDate: toIsoDate(value.recordDate!),
      provider: nullIfBlank(value.provider),
      notes: nullIfBlank(value.notes),
    };
    const { petId, record } = this.data;
    const call$ = record
      ? this.recordService.update(petId, record.id, request)
      : this.recordService.create(petId, request);

    this.saving.set(true);
    call$.subscribe({
      next: () => this.dialogRef.close('saved'),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 404) {
          const message = (err.error as { message?: string } | null)?.message;
          this.notifier.error(message === 'Record not found' ? 'This record no longer exists.' : 'This pet no longer exists.');
          this.dialogRef.close('gone');
          return;
        }
        this.banner.set(applyServerErrors(this.form, err));
      },
    });
  }
}
