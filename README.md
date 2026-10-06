# Novellia Pets

Keep track of your pets and their medical records. Add, view, edit and delete pets and records, see a dashboard of every pet, and search and filter both lists.

- **Backend:** Java 21, Spring Boot 3.5. All data lives in memory behind repository interfaces.
- **Frontend:** Angular 21 (standalone components, signals, typed reactive forms) with Angular Material.
- **Data resets when the API restarts.** It survives page refreshes, which is what the brief requires. Demo data is loaded at every start so the dashboard is never empty.

See [DECISIONS.md](DECISIONS.md) for assumptions, trade-offs, known limitations and how authentication would be added.

## Quick start

Prerequisite: Docker with Compose.

```
docker compose up --build
```

Then open <http://localhost:8080>. The API is also exposed at <http://localhost:8081/api>.

Stop with `docker compose down`.

| Service | URL | What it is |
| --- | --- | --- |
| web | <http://localhost:8080> | nginx serving the Angular build, proxying `/api` to the API |
| api | <http://localhost:8081> | Spring Boot REST API with the in-memory store |

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `APP_SEED_DEMO_DATA` | `true` | Load three demo pets and eight records at startup. Set to `false` to start empty, for example `APP_SEED_DEMO_DATA=false docker compose up`. |
| `APP_TIMEZONE` | JVM default | Time zone that decides what "today" is for the no-future-dates rules, for example `America/Los_Angeles`. The containers run in UTC, so set this if you are far from UTC. |
| `SERVER_PORT` | `8081` | API port when running outside Docker. |

### Port conflicts

If 8080 or 8081 is taken, change the left side of the mapping in `docker-compose.yml`, for example `"9090:80"` for the web service, and open that port instead. The web container reaches the API over the Compose network, so only the host side changes.

## Running without Docker

Prerequisites: Java 21 and Node 20.19+ or 22.12+. No Maven install is needed, because the Maven wrapper is committed.

API (port 8081):

```
cd backend
./mvnw spring-boot:run
```

UI (port 4200), in a second terminal. `ng serve` proxies `/api` to `localhost:8081`, so the browser sees one origin and no CORS setup is needed:

```
cd frontend
npm install
npx ng serve
```

Open <http://localhost:4200>.

## Tests

```
cd backend && ./mvnw test        # JUnit 5 and MockMvc, no database or container needed
cd frontend && npx ng test       # Angular's default runner (Vitest); add --watch=false for a single run
```

## Project layout

| Path | Contents |
| --- | --- |
| `backend/` | Spring Boot project: `pom.xml`, Maven wrapper, `Dockerfile`, `src/main`, `src/test` |
| `frontend/` | Angular workspace: `Dockerfile`, `nginx.conf`, `proxy.conf.json`, `src/app` |
| `docker-compose.yml` | Services `web` and `api` |
| `DECISIONS.md` | Trade-offs, assumptions, open questions, authentication approach |

Backend packages under `com.novellia.pets`: `pet`, `record`, `dashboard`, `common` (error handling, clock, store lock, sorting) and `demo`. Frontend folders under `src/app`: `core` (shell, interceptors, form helpers), `shared`, `models`, and `features/{dashboard,pets,records}`.

## API at a glance

JSON over REST under `/api`, with UUID identifiers and `yyyy-MM-dd` dates.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/pets?q=&species=&sort=` | List pets. `species` can repeat. `sort` is one of `name`, `createdAt`, `dateOfBirth` plus `,asc` or `,desc` |
| POST | `/api/pets` | Create a pet |
| GET, PUT, DELETE | `/api/pets/{petId}` | Get, replace or delete a pet (deleting also deletes its records) |
| GET | `/api/pets/{petId}/records?q=&type=&sort=` | List a pet's records. `sort` is one of `recordDate`, `type`, `title` |
| POST | `/api/pets/{petId}/records` | Create a record |
| GET, PUT, DELETE | `/api/pets/{petId}/records/{recordId}` | Get, replace or delete a record |
| GET | `/api/dashboard` | Totals, breakdowns, per-pet summary and the five newest records |

Errors share one body: `{"status": 400, "message": "Validation failed", "errors": {"name": "must not be blank"}}`. Unknown ids, and a record id under the wrong pet, return 404. Unknown sort fields and enum values return 400.

## Manual smoke checklist

There are no browser end-to-end tests, so run through this once after a change:

1. Open the dashboard. With demo data you see 3 pets, 8 records and activity in the last 30 days.
2. Add a pet with species Other and check that a "What kind of animal?" field appears and is required. Save, and the pet page shows "Other (your description)".
3. Add a medical record to it. Try a date in the future and a date before the birth date and check both are refused.
4. Edit the pet and the record. Change the pet from Other to Dog and check the description is gone.
5. On the pets list, search by name, breed and the Other description, use the species chips and the sort menu, then clear the filters.
6. On the pet page, search the records, use the type chips and click the Date, Type and Title headers.
7. Delete a record, then delete the pet. The confirmation names the pet and how many records go with it.
8. Refresh the page after each step above. Everything you did is still there.
9. Restart the API (`docker compose restart api`). The data returns to the demo data, which is expected because the store is in memory.
10. Narrow the window to phone width (under 600 px). The toolbar links collapse into a menu and the record dialog goes full screen.
