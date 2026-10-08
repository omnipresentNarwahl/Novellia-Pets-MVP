import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MedicalRecord, RecordRequest, RecordSort } from '../../models/medical-record';
import { RecordType } from '../../models/record-type';

export interface RecordListParams {
  q: string;
  types: RecordType[];
  sort: RecordSort;
}

@Injectable({ providedIn: 'root' })
export class RecordService {
  private readonly http = inject(HttpClient);

  list(petId: string, { q, types, sort }: RecordListParams): Observable<MedicalRecord[]> {
    let params = new HttpParams();
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    for (const type of types) {
      params = params.append('type', type);
    }
    params = params.set('sort', sort);
    return this.http.get<MedicalRecord[]>(`/api/pets/${petId}/records`, { params });
  }

  get(petId: string, recordId: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`/api/pets/${petId}/records/${recordId}`);
  }

  create(petId: string, request: RecordRequest): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(`/api/pets/${petId}/records`, request);
  }

  update(petId: string, recordId: string, request: RecordRequest): Observable<MedicalRecord> {
    return this.http.put<MedicalRecord>(`/api/pets/${petId}/records/${recordId}`, request);
  }

  delete(petId: string, recordId: string): Observable<void> {
    return this.http.delete<void>(`/api/pets/${petId}/records/${recordId}`);
  }
}
