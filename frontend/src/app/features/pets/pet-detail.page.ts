import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  catchError, combineLatest, debounceTime, distinctUntilChanged, filter, forkJoin, of, skip, startWith, switchMap,
  tap,
} from 'rxjs';
import { Notifier } from '../../core/notifier';
import {
  DEFAULT_RECORD_SORT, MedicalRecord, RecordSort, RecordSortField,
} from '../../models/medical-record';
import { Pet } from '../../models/pet';
import { StepProfile, StepsResponse } from '../../models/steps';
import { RECORD_TYPES, RECORD_TYPE_LABELS, RecordType } from '../../models/record-type';
import { AgePipe } from '../../shared/age.pipe';
import { confirm } from '../../shared/confirm-dialog';
import { EmptyState } from '../../shared/empty-state';
import { RecordTypeChip } from '../../shared/record-type-chip';
import { SpeciesIcon } from '../../shared/species-icon';
import { SpeciesLabelPipe } from '../../shared/species-label.pipe';
import { formDialogConfig } from '../../shared/form-dialog';
import { RecordDialog, RecordDialogData, RecordDialogMode } from '../records/record-dialog';
import { RecordService } from '../records/record.service';
import { STEP_RANGES, StepRange, rangeAverage, stepColumns } from '../steps/step-columns';
import { StepProfileChart } from '../steps/step-profile-chart';
import { StepsChart } from '../steps/steps-chart';
import { StepsService } from '../steps/steps.service';
import { openPetDialog } from './pet-dialog';
import { PetService } from './pet.service';

@Component({
  selector: 'app-pet-detail-page',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    AgePipe,
    EmptyState,
    RecordTypeChip,
    SpeciesIcon,
    SpeciesLabelPipe,
    StepProfileChart,
    StepsChart,
  ],
  templateUrl: './pet-detail.page.html',
  styleUrl: './pet-detail.page.scss',
})
export class PetDetailPage {
  private readonly petService = inject(PetService);
  private readonly recordService = inject(RecordService);
  private readonly stepsService = inject(StepsService);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);

  /** Bound from the route. */
  readonly petId = input.required<string>();

  protected readonly typeOptions = RECORD_TYPES;
  protected readonly typeLabels = RECORD_TYPE_LABELS;
  protected readonly columns = ['recordDate', 'type', 'title', 'provider', 'notes', 'actions'];

  protected readonly pet = signal<Pet | null>(null);
  protected readonly petLoading = signal(true);
  protected readonly petError = signal(false);
  private readonly petTick = signal(0);

  protected readonly search = signal('');
  protected readonly types = signal<RecordType[]>([]);
  protected readonly sort = signal<RecordSort>(DEFAULT_RECORD_SORT);
  private readonly recordsTick = signal(0);

  protected readonly records = signal<MedicalRecord[]>([]);
  protected readonly recordsLoading = signal(true);
  protected readonly recordsError = signal(false);

  protected readonly steps = signal<StepsResponse | null>(null);
  protected readonly stepProfile = signal<StepProfile | null>(null);
  protected readonly stepsError = signal(false);
  private readonly stepsTick = signal(0);
  protected readonly stepRanges = STEP_RANGES;
  protected readonly stepRange = signal<StepRange>('month');
  protected readonly stepRangeInfo = computed(() => STEP_RANGES.find((r) => r.value === this.stepRange())!);
  protected readonly stepChartColumns = computed(() => stepColumns(this.steps()?.days ?? [], this.stepRange()));
  protected readonly stepRangeAverage = computed(() => rangeAverage(this.steps()?.days ?? [], this.stepRange()));

  protected readonly hasFilters = computed(() => this.search().trim() !== '' || this.types().length > 0);
  protected readonly sortField = computed(() => this.sort().split(',')[0]);
  protected readonly sortDirection = computed(() => this.sort().split(',')[1] as 'asc' | 'desc');

  constructor() {
    combineLatest([toObservable(this.petId), toObservable(this.petTick)])
      .pipe(
        tap(() => {
          this.petLoading.set(true);
          this.petError.set(false);
        }),
        switchMap(([id]) =>
          this.petService.get(id).pipe(
            catchError((err: HttpErrorResponse) => {
              if (err.status === 404) {
                void this.router.navigate(['/not-found'], { skipLocationChange: true });
              } else {
                this.petError.set(true);
              }
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pet) => {
        if (pet) {
          this.pet.set(pet);
        }
        this.petLoading.set(false);
      });

    combineLatest([toObservable(this.petId), toObservable(this.stepsTick)])
      .pipe(
        tap(() => this.stepsError.set(false)),
        switchMap(([id]) =>
          forkJoin({
            // A year of daily totals, so switching the chart's range needs no further requests.
            daily: this.stepsService.daily(id, 366),
            profile: this.stepsService.profile(id),
          }).pipe(
            catchError((err: HttpErrorResponse) => {
              // A 404 means the pet is gone, and the pet request above routes to the not-found page.
              this.stepsError.set(err.status !== 404);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.steps.set(result?.daily ?? null);
        this.stepProfile.set(result?.profile ?? null);
      });

    // Typing is debounced; chips and sort apply immediately. switchMap cancels a request still in flight.
    const search$ = toObservable(this.search).pipe(
      skip(1),
      debounceTime(300),
      startWith(this.search()),
      distinctUntilChanged(),
    );
    combineLatest([
      toObservable(this.petId),
      search$,
      toObservable(this.types),
      toObservable(this.sort),
      toObservable(this.recordsTick),
    ])
      .pipe(
        tap(() => {
          this.recordsLoading.set(true);
          this.recordsError.set(false);
        }),
        switchMap(([petId, q, types, sort]) =>
          this.recordService.list(petId, { q, types, sort }).pipe(
            catchError((err: HttpErrorResponse) => {
              // A 404 means the pet is gone, and the pet request above routes to the not-found page.
              this.recordsError.set(err.status !== 404);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((records) => {
        if (records) {
          this.records.set(records);
        }
        this.recordsLoading.set(false);
      });
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected toggleType(type: RecordType, selected: boolean): void {
    this.types.update((current) => {
      const without = current.filter((t) => t !== type);
      return selected ? [...without, type] : without;
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.types.set([]);
  }

  protected onSort(event: Sort): void {
    this.sort.set(
      event.direction
        ? (`${event.active as RecordSortField},${event.direction}` as RecordSort)
        : DEFAULT_RECORD_SORT,
    );
  }

  protected retryPet(): void {
    this.petTick.update((n) => n + 1);
  }

  protected retrySteps(): void {
    this.stepsTick.update((n) => n + 1);
  }

  protected retryRecords(): void {
    this.recordsTick.update((n) => n + 1);
  }

  /** After any record change: the record count lives on the pet, so both reload. */
  private reloadAll(): void {
    this.retryPet();
    this.retryRecords();
  }

  protected openRecordDialog(record?: MedicalRecord, mode: RecordDialogMode = 'view'): void {
    const pet = this.pet();
    if (!pet) {
      return;
    }
    const data: RecordDialogData = {
      petId: pet.id,
      petName: pet.name,
      petSpecies: pet.species,
      petDateOfBirth: pet.dateOfBirth,
      record,
      mode,
    };
    this.dialog
      .open(RecordDialog, formDialogConfig(this.breakpoints, data))
      .afterClosed()
      .subscribe((result) => {
        if (result === 'saved') {
          this.notifier.success(record ? 'Record updated' : 'Record added');
          this.reloadAll();
        } else if (result === 'deleted') {
          this.notifier.success('Record deleted');
          this.reloadAll();
        } else if (result === 'gone') {
          this.reloadAll();
        }
      });
  }

  protected deleteRecord(record: MedicalRecord): void {
    const pet = this.pet();
    if (!pet) {
      return;
    }
    confirm(this.dialog, {
      title: 'Delete this record?',
      message: `"${record.title}" will be removed from ${pet.name}'s records. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.recordService.delete(pet.id, record.id)),
      )
      .subscribe({
        next: () => {
          this.notifier.success('Record deleted');
          this.reloadAll();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.notifier.error('That record no longer exists.');
          }
          this.reloadAll();
        },
      });
  }

  protected editPet(): void {
    const pet = this.pet();
    if (!pet) {
      return;
    }
    openPetDialog(this.dialog, this.breakpoints, pet).subscribe((result) => {
      if (result && result !== 'gone') {
        this.notifier.success('Pet updated');
        this.pet.set(result);
      } else if (result === 'gone') {
        this.retryPet();
      }
    });
  }

  protected deletePet(): void {
    const pet = this.pet();
    if (!pet) {
      return;
    }
    const records =
      pet.recordCount === 0
        ? 'It has no medical records.'
        : `This also removes ${pet.recordCount} medical ${pet.recordCount === 1 ? 'record' : 'records'}.`;
    confirm(this.dialog, {
      title: `Delete ${pet.name}?`,
      message: `${records} This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.petService.delete(pet.id)),
      )
      .subscribe({
        next: () => {
          this.notifier.success(`${pet.name} deleted`);
          void this.router.navigate(['/pets']);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            void this.router.navigate(['/pets']);
          }
        },
      });
  }
}
