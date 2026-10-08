import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { hasModifierKey } from '@angular/cdk/keycodes';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { filter, merge, tap } from 'rxjs';
import { confirm } from './confirm-dialog';

/** A centered 480px modal, or full screen on phones. */
export function formDialogConfig<D>(breakpoints: BreakpointObserver, data: D): MatDialogConfig<D> {
  const phone = breakpoints.isMatched('(max-width: 599.98px)');
  return {
    data,
    width: phone ? '100vw' : '480px',
    maxWidth: '100vw',
    height: phone ? '100vh' : undefined,
    maxHeight: phone ? '100vh' : undefined,
    panelClass: 'form-dialog-panel',
  };
}

/**
 * Clicking the backdrop or pressing Escape would silently throw away edits, so for the dialog being constructed
 * those close it straight away only while `form` is pristine, and otherwise ask first. Call from a constructor.
 */
export function confirmCloseWhenDirty(form: AbstractControl): void {
  const dialogRef = inject(MatDialogRef);
  const dialog = inject(MatDialog);
  const destroyRef = inject(DestroyRef);

  dialogRef.disableClose = true;
  merge(
    dialogRef.backdropClick(),
    dialogRef.keydownEvents().pipe(
      filter((event) => event.key === 'Escape' && !hasModifierKey(event)),
      tap((event) => event.preventDefault()),
    ),
  )
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => {
      if (!form.dirty) {
        dialogRef.close();
        return;
      }
      confirm(dialog, {
        title: 'Discard changes?',
        message: 'You have unsaved changes. If you close this now they will be lost.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        destructive: true,
      })
        .pipe(filter(Boolean))
        .subscribe(() => dialogRef.close());
    });
}
