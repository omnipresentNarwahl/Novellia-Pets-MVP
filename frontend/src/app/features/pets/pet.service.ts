import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Pet, PetRequest, PetSort } from '../../models/pet';
import { Species } from '../../models/species';

export interface PetListParams {
  q: string;
  species: Species[];
  sort: PetSort;
}

@Injectable({ providedIn: 'root' })
export class PetService {
  private readonly http = inject(HttpClient);

  list({ q, species, sort }: PetListParams): Observable<Pet[]> {
    let params = new HttpParams();
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    for (const s of species) {
      params = params.append('species', s);
    }
    params = params.set('sort', sort);
    return this.http.get<Pet[]>('/api/pets', { params });
  }

  get(id: string): Observable<Pet> {
    return this.http.get<Pet>(`/api/pets/${id}`);
  }

  create(request: PetRequest): Observable<Pet> {
    return this.http.post<Pet>('/api/pets', request);
  }

  update(id: string, request: PetRequest): Observable<Pet> {
    return this.http.put<Pet>(`/api/pets/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/pets/${id}`);
  }
}
