import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Pet } from '../../models/pet';
import { PetListPage } from './pet-list.page';

const pet = (overrides: Partial<Pet> = {}): Pet => ({
  id: 'p1',
  name: 'Biscuit',
  species: 'DOG',
  speciesOther: null,
  breed: 'Beagle',
  dateOfBirth: '2020-01-01',
  notes: null,
  recordCount: 2,
  lastRecordDate: '2026-01-02',
  averageDailySteps: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('PetListPage', () => {
  let fixture: ComponentFixture<PetListPage>;
  let http: HttpTestingController;

  type Internals = {
    search: { set(v: string): void };
    species: { set(v: string[]): void };
    sort: { set(v: string): void };
    clearFilters(): void;
  };
  const page = () => fixture.componentInstance as unknown as Internals;
  const listRequest = (): TestRequest => http.expectOne((r) => r.url === '/api/pets' && r.method === 'GET');
  const settle = async () => {
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetListPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PetListPage);
    fixture.detectChanges();
    await settle();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('loads the pets with the default sort and renders a card for each', async () => {
    const req = listRequest();
    expect(req.request.params.get('sort')).toBe('name,asc');
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.getAll('species')).toBeNull();
    req.flush([pet(), pet({ id: 'p2', name: 'Pancake', species: 'OTHER', speciesOther: 'axolotl', breed: null })]);
    await settle();

    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelectorAll('.pet-card').length).toBe(2);
    expect(text).toContain('Biscuit');
    expect(text).toContain('Other (axolotl)');
  });

  it('sends the species chips as a repeated parameter and the sort straight away', async () => {
    listRequest().flush([pet()]);
    await settle();

    page().species.set(['DOG', 'CAT']);
    await settle();
    const bySpecies = listRequest();
    expect(bySpecies.request.params.getAll('species')).toEqual(['DOG', 'CAT']);
    bySpecies.flush([]);
    await settle();

    page().sort.set('dateOfBirth,desc');
    await settle();
    const bySort = listRequest();
    expect(bySort.request.params.get('sort')).toBe('dateOfBirth,desc');
    expect(bySort.request.params.getAll('species')).toEqual(['DOG', 'CAT']);
    bySort.flush([]);
  });

  it('debounces typing by 300 ms and sends one request for the final text', async () => {
    listRequest().flush([pet()]);
    await settle();

    vi.useFakeTimers();
    page().search.set('b');
    TestBed.tick();
    vi.advanceTimersByTime(200);
    page().search.set('bis');
    TestBed.tick();
    vi.advanceTimersByTime(299);
    http.expectNone((r) => r.url === '/api/pets');

    vi.advanceTimersByTime(1);
    const req = listRequest();
    expect(req.request.params.get('q')).toBe('bis');
    req.flush([pet()]);
  });

  it('shows "No pets match your search" with a clear button when filters match nothing', async () => {
    listRequest().flush([pet()]);
    await settle();

    page().species.set(['BIRD']);
    await settle();
    listRequest().flush([]);
    await settle();

    expect(fixture.nativeElement.textContent).toContain('No pets match your search');

    fixture.nativeElement.querySelector('app-empty-state button').click();
    await settle();
    const req = listRequest();
    expect(req.request.params.getAll('species')).toBeNull();
    req.flush([pet()]);
  });

  it('shows the 7-day step average only on the cards of pets with a tracker', async () => {
    listRequest().flush([pet({ id: 'a', name: 'Biscuit', averageDailySteps: 12_345 }), pet({ id: 'b', name: 'Pancake' })]);
    await settle();
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.pet-card')) as HTMLElement[];
    expect(cards[0].textContent).toContain('Daily steps (7-day avg)');
    expect(cards[0].textContent).toContain('12,345');
    expect(cards[1].textContent).not.toContain('Daily steps');
  });

  it('shows the empty state with an Add pet button when there are no pets at all', async () => {
    listRequest().flush([]);
    await settle();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No pets yet');
    expect(fixture.nativeElement.querySelector('app-empty-state button')?.textContent).toContain('Add pet');
  });

  it('shows an error state with Retry that reloads', async () => {
    listRequest().flush({ status: 500 }, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(fixture.nativeElement.textContent).toContain('Could not load pets');

    fixture.nativeElement.querySelector('app-empty-state button').click();
    await settle();
    listRequest().flush([pet()]);
    await settle();
    expect(fixture.nativeElement.querySelectorAll('.pet-card').length).toBe(1);
  });
});
