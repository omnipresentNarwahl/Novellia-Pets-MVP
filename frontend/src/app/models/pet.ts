import { Species } from './species';

export interface Pet {
  id: string;
  name: string;
  species: Species;
  speciesOther: string | null;
  breed: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  recordCount: number;
  lastRecordDate: string | null;
  /** Mean daily steps over the last seven complete days; null for a pet without a tracker. */
  averageDailySteps: number | null;
  createdAt: string;
}

export interface PetRequest {
  name: string;
  species: Species;
  speciesOther: string | null;
  breed: string | null;
  dateOfBirth: string | null;
  notes: string | null;
}

export const PET_SORTS = [
  { value: 'name,asc', label: 'Name A to Z' },
  { value: 'name,desc', label: 'Name Z to A' },
  { value: 'createdAt,desc', label: 'Recently added' },
  { value: 'dateOfBirth,desc', label: 'Youngest first' },
  { value: 'dateOfBirth,asc', label: 'Oldest first' },
] as const;
export type PetSort = (typeof PET_SORTS)[number]['value'];
export const DEFAULT_PET_SORT: PetSort = 'name,asc';
