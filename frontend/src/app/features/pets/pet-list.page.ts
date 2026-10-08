import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, filter, of, skip, startWith, switchMap, tap } from 'rxjs';
import { Notifier } from '../../core/notifier';
import { DEFAULT_PET_SORT, PET_SORTS, Pet, PetSort } from '../../models/pet';
import { SPECIES, SPECIES_LABELS, Species } from '../../models/species';
import { AgePipe } from '../../shared/age.pipe';
import { confirm } from '../../shared/confirm-dialog';
import { EmptyState } from '../../shared/empty-state';
import { SpeciesIcon } from '../../shared/species-icon';
import { SpeciesLabelPipe } from '../../shared/species-label.pipe';
import { openPetDialog } from './pet-dialog';
import { PetService } from './pet.service';

@Component({
  selector: 'app-pet-list-page',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    AgePipe,
    EmptyState,
    SpeciesIcon,
    SpeciesLabelPipe,
  ],
  templateUrl: './pet-list.page.html',
  styleUrl: './pet-list.page.scss',
})
export class PetListPage {
  private readonly petService = inject(PetService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);

  protected readonly speciesOptions = SPECIES;
  protected readonly speciesLabels = SPECIES_LABELS;
  protected readonly sorts = PET_SORTS;

  protected readonly search = signal('');
  protected readonly species = signal<Species[]>([]);
  protected readonly sort = signal<PetSort>(DEFAULT_PET_SORT);
  private readonly reloadTick = signal(0);

  protected readonly pets = signal<Pet[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly hasFilters = computed(() => this.search().trim() !== '' || this.species().length > 0);
  protected readonly sortLabel = computed(() => PET_SORTS.find((s) => s.value === this.sort())?.label ?? '');

  constructor() {
    // Typing is debounced; chips and sort apply immediately. switchMap cancels a request still in flight.
    const search$ = toObservable(this.search).pipe(
      skip(1),
      debounceTime(300),
      startWith(this.search()),
      distinctUntilChanged(),
    );

    combineLatest([search$, toObservable(this.species), toObservable(this.sort), toObservable(this.reloadTick)])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(([q, species, sort]) =>
          this.petService.list({ q, species, sort }).pipe(
            catchError(() => {
              this.error.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pets) => {
        if (pets) {
          this.pets.set(pets);
        }
        this.loading.set(false);
      });
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected toggleSpecies(species: Species, selected: boolean): void {
    this.species.update((current) => {
      const without = current.filter((s) => s !== species);
      return selected ? [...without, species] : without;
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.species.set([]);
  }

  protected retry(): void {
    this.reloadTick.update((n) => n + 1);
  }

  protected addPet(): void {
    openPetDialog(this.dialog, this.breakpoints).subscribe((result) => {
      if (result && result !== 'gone') {
        this.notifier.success('Pet added');
        void this.router.navigate(['/pets', result.id]);
      }
    });
  }

  protected editPet(pet: Pet): void {
    openPetDialog(this.dialog, this.breakpoints, pet).subscribe((result) => {
      if (result && result !== 'gone') {
        this.notifier.success('Pet updated');
      }
      if (result) {
        this.retry();
      }
    });
  }

  protected deletePet(pet: Pet): void {
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
          this.retry();
        },
        error: () => {
          this.notifier.error(`Could not delete ${pet.name}. It may already be gone.`);
          this.retry();
        },
      });
  }
}
