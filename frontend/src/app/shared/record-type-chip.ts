import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RECORD_TYPE_ICONS, RECORD_TYPE_LABELS, RecordType } from '../models/record-type';

/** Shows text as well as an icon, so the type is never conveyed by color or icon alone. */
@Component({
  selector: 'app-record-type-chip',
  imports: [MatIconModule],
  template: `
    <span class="chip" [attr.data-type]="type()">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      {{ label() }}
    </span>
  `,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px 2px 6px;
      border-radius: 999px;
      font: var(--mat-sys-label-large);
      white-space: nowrap;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .chip[data-type='VACCINATION'] { background: #e3f2fd; color: #0d47a1; }
    .chip[data-type='VET_VISIT'] { background: #e8f5e9; color: #1b5e20; }
    .chip[data-type='MEDICATION'] { background: #fff3e0; color: #7a4100; }
    .chip[data-type='PROCEDURE'] { background: #fce4ec; color: #880e4f; }
    .chip[data-type='OTHER'] { background: #eceff1; color: #37474f; }
  `,
})
export class RecordTypeChip {
  readonly type = input.required<RecordType>();
  protected readonly icon = computed(() => RECORD_TYPE_ICONS[this.type()]);
  protected readonly label = computed(() => RECORD_TYPE_LABELS[this.type()]);
}
