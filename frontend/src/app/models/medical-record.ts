import { RecordType } from './record-type';

export interface MedicalRecord {
  id: string;
  petId: string;
  type: RecordType;
  title: string;
  recordDate: string;
  provider: string | null;
  notes: string | null;
  createdAt: string;
}

export interface RecordRequest {
  type: RecordType;
  title: string;
  recordDate: string;
  provider: string | null;
  notes: string | null;
}

export type RecordSortField = 'recordDate' | 'type' | 'title';
export type RecordSort = `${RecordSortField},${'asc' | 'desc'}`;
export const DEFAULT_RECORD_SORT: RecordSort = 'recordDate,desc';
