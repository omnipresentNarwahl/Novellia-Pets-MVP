import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { parseIsoDate, toIsoDate, today } from '../../core/dates';
import { applyServerErrors, errorMessage } from '../../core/form-errors';
import { Notifier } from '../../core/notifier';
import { nullIfBlank } from '../../core/strings';
import { notBlank } from '../../core/validators';
import { Pet, PetRequest } from '../../models/pet';
import { SPECIES, SPECIES_LABELS, Species } from '../../models/species';
import { confirmCloseWhenDirty, formDialogConfig } from '../../shared/form-dialog';
import { PetService } from './pet.service';

export interface PetDialogData {
  /** Present when editing; absent when adding. */
  pet?: Pet;
}

/** The saved pet, or `gone` when the pet was deleted (for example in another tab) before saving. */
export type PetDialogResult = Pet | 'gone';

/** Opens the add dialog, or the edit dialog when given a pet. Emits the result, or undefined when cancelled. */
export function openPetDialog(
  dialog: MatDialog,
  breakpoints: BreakpointObserver,
  pet?: Pet,
): Observable<PetDialogResult | undefined> {
  return dialog
    .open<PetDialog, PetDialogData, PetDialogResult>(PetDialog, formDialogConfig(breakpoints, { pet }))
    .afterClosed();
}

/** The "kind of animal" is required only when the species is Other. */
function requiredWhenOther(control: AbstractControl): ValidationErrors | null {
  const species = control.parent?.get('species')?.value as Species | null | undefined;
  const value = control.value as string | null;
  return species === 'OTHER' && !value?.trim() ? { required: true } : null;
}

@Component({
  selector: 'app-pet-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './pet-dialog.html',
  styleUrl: './pet-dialog.scss',
})
export class PetDialog {
  private readonly data = inject<PetDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PetDialog, PetDialogResult>>(MatDialogRef);
  private readonly petService = inject(PetService);
  private readonly notifier = inject(Notifier);

  protected readonly speciesOptions = SPECIES;
  protected readonly speciesLabels = SPECIES_LABELS;
  protected readonly maxDate = today();
  protected readonly pet = this.data.pet;

  protected readonly form = new FormGroup({
    name: new FormControl(this.pet?.name ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(100)],
    }),
    species: new FormControl<Species | null>(this.pet?.species ?? null, { validators: [Validators.required] }),
    speciesOther: new FormControl(this.pet?.speciesOther ?? '', {
      nonNullable: true,
      validators: [requiredWhenOther, Validators.maxLength(50)],
    }),
    breed: new FormControl(this.pet?.breed ?? '', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    dateOfBirth: new FormControl<Date | null>(this.pet?.dateOfBirth ? parseIsoDate(this.pet.dateOfBirth) : null),
    notes: new FormControl(this.pet?.notes ?? '', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
  });

  protected readonly species = toSignal(this.form.controls.species.valueChanges, {
    initialValue: this.form.controls.species.value,
  });

  protected readonly saving = signal(false);
  protected readonly banner = signal<string | null>(null);

  protected readonly error = (name: keyof typeof this.form.controls, label: string) =>
    errorMessage(this.form.controls[name], label);

  constructor() {
    confirmCloseWhenDirty(this.form);

    // Switching away from Other clears the description, and switching to it re-checks it.
    this.form.controls.species.valueChanges.pipe(takeUntilDestroyed()).subscribe((species) => {
      if (species !== 'OTHER') {
        this.form.controls.speciesOther.setValue('');
      }
      this.form.controls.speciesOther.updateValueAndValidity();
    });
  }

  protected submit(): void {
    this.banner.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: PetRequest = {
      name: value.name.trim(),
      species: value.species!,
      speciesOther: value.species === 'OTHER' ? nullIfBlank(value.speciesOther) : null,
      breed: nullIfBlank(value.breed),
      dateOfBirth: value.dateOfBirth ? toIsoDate(value.dateOfBirth) : null,
      notes: nullIfBlank(value.notes),
    };

    const call$ = this.pet ? this.petService.update(this.pet.id, request) : this.petService.create(request);
    this.saving.set(true);
    call$.subscribe({
      next: (pet) => this.dialogRef.close(pet),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 404) {
          this.notifier.error('This pet no longer exists.');
          this.dialogRef.close('gone');
          return;
        }
        this.banner.set(applyServerErrors(this.form, err));
      },
    });
  }
}
