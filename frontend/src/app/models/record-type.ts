export const RECORD_TYPES = ['VACCINATION', 'VET_VISIT', 'MEDICATION', 'PROCEDURE', 'OTHER'] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  VACCINATION: 'Vaccination',
  VET_VISIT: 'Vet visit',
  MEDICATION: 'Medication',
  PROCEDURE: 'Procedure',
  OTHER: 'Other',
};

export const RECORD_TYPE_ICONS: Record<RecordType, string> = {
  VACCINATION: 'vaccines',
  VET_VISIT: 'medical_services',
  MEDICATION: 'medication',
  PROCEDURE: 'healing',
  OTHER: 'description',
};
