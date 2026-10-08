import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { filter, switchMap } from 'rxjs';
import { parseIsoDate, toIsoDate, today } from '../../core/dates';
import { applyServerErrors, errorMessage } from '../../core/form-errors';
import { Notifier } from '../../core/notifier';
import { nullIfBlank } from '../../core/strings';
import { notBlank } from '../../core/validators';
import { MedicalRecord, RecordRequest } from '../../models/medical-record';
import { RECORD_TYPES, RECORD_TYPE_LABELS, RecordType } from '../../models/record-type';
import { confirm } from '../../shared/confirm-dialog';
import { RecordTypeChip } from '../../shared/record-type-chip';
import { RecordService } from './record.service';

export type RecordDialogMode = 'view' | 'edit';

export interface RecordDialogData {
  petId: string;
  petName: string;
  petDateOfBirth: string | null;
  /** Present when viewing or editing; absent when adding. */
  record?: MedicalRecord;
  /** How an existing record opens. Defaults to `view`. */
  mode?: RecordDialogMode;
}

/**
 * `saved` and `deleted` mean reload; `gone` means the pet or record disappeared (for example deleted in
 * another tab).
 */
export type RecordDialogResult = 'saved' | 'deleted' | 'gone';

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
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    RecordTypeChip,
  ],
  templateUrl: './record-dialog.html',
  styleUrl: './record-dialog.scss',
})
export class RecordDialog {
  private readonly data = inject<RecordDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RecordDialog, RecordDialogResult>>(MatDialogRef);
  private readonly recordService = inject(RecordService);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);

  protected readonly typeOptions = RECORD_TYPES;
  protected readonly typeLabels = RECORD_TYPE_LABELS;
  protected readonly petName = this.data.petName;
  protected readonly record = this.data.record;
  protected readonly isExisting = !!this.record;
  /** Cancel returns to the read view only when the dialog started there. */
  private readonly openedInView = this.isExisting && (this.data.mode ?? 'view') === 'view';
  protected readonly mode = signal<RecordDialogMode>(this.openedInView ? 'view' : 'edit');
  protected readonly maxDate = today();
  protected readonly minDate = this.data.petDateOfBirth ? parseIsoDate(this.data.petDateOfBirth) : null;

  protected readonly saving = signal(false);
  protected readonly banner = signal<string | null>(null);

  // Every control is non-nullable so that reset() restores the record's values when an edit is cancelled.
  protected readonly form = new FormGroup({
    type: new FormControl<RecordType | null>(this.data.record?.type ?? null, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl(this.data.record?.title ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(150)],
    }),
    recordDate: new FormControl<Date | null>(
      this.data.record ? parseIsoDate(this.data.record.recordDate) : today(),
      { nonNullable: true, validators: [Validators.required] },
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

  protected edit(): void {
    this.mode.set('edit');
  }

  protected cancel(): void {
    if (!this.openedInView) {
      this.dialogRef.close();
      return;
    }
    this.banner.set(null);
    this.form.reset();
    this.mode.set('view');
  }

  protected delete(): void {
    const { petId, petName, record } = this.data;
    if (!record) {
      return;
    }
    confirm(this.dialog, {
      title: 'Delete this record?',
      message: `"${record.title}" will be removed from ${petName}'s records. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.recordService.delete(petId, record.id)),
      )
      .subscribe({
        next: () => this.dialogRef.close('deleted'),
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.notifier.error('This record no longer exists.');
            this.dialogRef.close('gone');
          }
        },
      });
  }

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
