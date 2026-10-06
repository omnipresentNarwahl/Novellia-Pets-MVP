export const SPECIES = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER'] as const;
export type Species = (typeof SPECIES)[number];

export const SPECIES_LABELS: Record<Species, string> = {
  DOG: 'Dog',
  CAT: 'Cat',
  BIRD: 'Bird',
  RABBIT: 'Rabbit',
  REPTILE: 'Reptile',
  OTHER: 'Other',
};

export const SPECIES_EMOJI: Record<Species, string> = {
  DOG: '🐶',
  CAT: '🐱',
  BIRD: '🐦',
  RABBIT: '🐰',
  REPTILE: '🦎',
  OTHER: '🐾',
};
