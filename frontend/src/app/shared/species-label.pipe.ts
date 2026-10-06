import { Pipe, PipeTransform } from '@angular/core';
import { SPECIES_LABELS, Species } from '../models/species';

/** "Dog", or "Other (axolotl)" when the species is Other and has a description. */
@Pipe({ name: 'speciesLabel' })
export class SpeciesLabelPipe implements PipeTransform {
  transform(pet: { species: Species; speciesOther: string | null }): string {
    const label = SPECIES_LABELS[pet.species];
    return pet.species === 'OTHER' && pet.speciesOther ? `${label} (${pet.speciesOther})` : label;
  }
}
