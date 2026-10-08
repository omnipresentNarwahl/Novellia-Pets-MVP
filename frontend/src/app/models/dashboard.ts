import { RecordType } from './record-type';
import { Species } from './species';

export interface LabelCount {
  label: string;
  count: number;
}

export interface DashboardPet {
  petId: string;
  name: string;
  species: Species;
  speciesOther: string | null;
  dateOfBirth: string | null;
  recordCount: number;
  lastRecordDate: string | null;
  /** Mean daily steps over the last seven complete days; null for a pet without a tracker. */
  averageDailySteps: number | null;
}

export interface RecentRecord {
  id: string;
  petId: string;
  petName: string;
  type: RecordType;
  title: string;
  recordDate: string;
}

export interface Dashboard {
  totalPets: number;
  totalRecords: number;
  recordsLast30Days: number;
  petsBySpecies: LabelCount[];
  recordsByType: LabelCount[];
  pets: DashboardPet[];
  recentRecords: RecentRecord[];
}
