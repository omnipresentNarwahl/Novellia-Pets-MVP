import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StepProfile, StepsResponse } from '../../models/steps';

@Injectable({ providedIn: 'root' })
export class StepsService {
  private readonly http = inject(HttpClient);

  daily(petId: string, days = 30): Observable<StepsResponse> {
    const params = new HttpParams().set('days', days);
    return this.http.get<StepsResponse>(`/api/pets/${petId}/steps/daily`, { params });
  }

  profile(petId: string): Observable<StepProfile> {
    return this.http.get<StepProfile>(`/api/pets/${petId}/steps/profile`);
  }
}
