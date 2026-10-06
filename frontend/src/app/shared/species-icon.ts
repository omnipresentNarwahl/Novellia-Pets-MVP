import { Component, computed, input } from '@angular/core';
import { SPECIES_EMOJI, Species } from '../models/species';

@Component({
  selector: 'app-species-icon',
  template: `<span class="icon" aria-hidden="true">{{ emoji() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
    }
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.2em;
      height: 2.2em;
      border-radius: 50%;
      background: var(--mat-sys-secondary-container);
      font-size: var(--species-icon-size, 20px);
      line-height: 1;
    }
  `,
})
export class SpeciesIcon {
  readonly species = input.required<Species>();
  protected readonly emoji = computed(() => SPECIES_EMOJI[this.species()]);
}
