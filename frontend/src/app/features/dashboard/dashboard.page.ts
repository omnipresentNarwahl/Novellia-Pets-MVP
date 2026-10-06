import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Dashboard, LabelCount } from '../../models/dashboard';
import { AgePipe } from '../../shared/age.pipe';
import { EmptyState } from '../../shared/empty-state';
import { RecordTypeChip } from '../../shared/record-type-chip';
import { SpeciesIcon } from '../../shared/species-icon';
import { SpeciesLabelPipe } from '../../shared/species-label.pipe';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    DatePipe,
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
}
