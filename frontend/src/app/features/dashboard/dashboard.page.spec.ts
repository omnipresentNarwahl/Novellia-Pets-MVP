import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard, DashboardPet } from '../../models/dashboard';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let http: HttpTestingController;

  const pet = (name: string, averageDailySteps: number | null): DashboardPet => ({
    petId: name,
    name,
    species: 'DOG',
    speciesOther: null,
    dateOfBirth: null,
    recordCount: 0,
    lastRecordDate: null,
    averageDailySteps,
  });
  const dashboard: Dashboard = {
    totalPets: 2,
    totalRecords: 0,
    recordsLast30Days: 0,
    petsBySpecies: [],
    recordsByType: [],
    pets: [pet('Biscuit', 11_873), pet('Pancake', null)],
    recentRecords: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    http.expectOne('/api/dashboard').flush(dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('shows the 7-day step average for tracked pets and No tracker otherwise', () => {
    const rows = Array.from(fixture.nativeElement.querySelectorAll('table.glance tbody tr')) as HTMLElement[];
    const lastCell = (row: HTMLElement) => row.querySelector('td:last-child')!.textContent!.trim();
    expect(lastCell(rows[0])).toBe('11,873');
    expect(lastCell(rows[1])).toBe('No tracker');
  });
});
