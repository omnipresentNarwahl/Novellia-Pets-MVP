import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, switchMap } from 'rxjs';
import { Notifier } from '../../core/notifier';
import { Dashboard, LabelCount, RecentRecord } from '../../models/dashboard';
import { AgePipe } from '../../shared/age.pipe';
import { EmptyState } from '../../shared/empty-state';
import { RecordTypeChip } from '../../shared/record-type-chip';
import { SpeciesIcon } from '../../shared/species-icon';
import { SpeciesLabelPipe } from '../../shared/species-label.pipe';
import { PetService } from '../pets/pet.service';
import { formDialogConfig } from '../../shared/form-dialog';
import { openPetDialog } from '../pets/pet-dialog';
import { RecordDialog } from '../records/record-dialog';
import { RecordService } from '../records/record.service';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    AgePipe,
    EmptyState,
    RecordTypeChip,
    SpeciesIcon,
    SpeciesLabelPipe,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly service = inject(DashboardService);
  private readonly petService = inject(PetService);
  private readonly recordService = inject(RecordService);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service.get().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Share of the total, for the determinate progress bars. */
  protected share(item: LabelCount, total: number): number {
    return total === 0 ? 0 : Math.round((item.count / total) * 100);
  }

  protected addPet(): void {
    openPetDialog(this.dialog, this.breakpoints).subscribe((result) => {
      if (result && result !== 'gone') {
        this.notifier.success('Pet added');
        void this.router.navigate(['/pets', result.id]);
      }
    });
  }

  /** The dashboard only carries a summary, so fetch the full record and the pet's birth date before opening it. */
  protected openRecord(recent: RecentRecord): void {
    forkJoin([this.petService.get(recent.petId), this.recordService.get(recent.petId, recent.id)])
      .pipe(
        switchMap(([pet, record]) =>
          this.dialog
            .open(
              RecordDialog,
              formDialogConfig(this.breakpoints, {
                petId: pet.id,
                petName: pet.name,
                petSpecies: pet.species,
                petDateOfBirth: pet.dateOfBirth,
                record,
              }),
            )
            .afterClosed(),
        ),
      )
      .subscribe({
        next: (result) => {
          if (result === 'saved') {
            this.notifier.success('Record updated');
          } else if (result === 'deleted') {
            this.notifier.success('Record deleted');
          }
          if (result) {
            this.load();
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.notifier.error('This record no longer exists.');
            this.load();
          }
        },
      });
  }
}
