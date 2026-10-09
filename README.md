# Novellia Pets

Keep track of your pets and their medical records. Add, view, edit and delete pets and records, see a dashboard of every pet, and search and filter both lists.

Pets with an activity tracker also show their steps: a 7-day daily average on the dashboard and pet cards, a step chart by day, week or month, and a "typical day" chart in the style of an ambulatory glucose profile. There is no real tracker integration. The step data is generated with the demo data.

- **Backend:** Java 21, Spring Boot 3.5. All data lives in memory behind repository interfaces.
- **Frontend:** Angular 21 (standalone components, signals, typed reactive forms) with Angular Material.
- **Data resets when the API restarts.** It survives page refreshes, which is what the brief requires. Demo data is loaded at every start so the dashboard is never empty.

See [DECISIONS.md](DECISIONS.md) for assumptions, trade-offs, known limitations and how authentication would be added.

Demo: [Loom Video](https://www.loom.com/share/ba7e6e7d17874e3185a0f735dd1872b6)

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
| `APP_SEED_DEMO_DATA` | `true` | Load three demo pets, eight records and a year of 10-minute step data for two of the pets at startup. Set to `false` to start empty, for example `APP_SEED_DEMO_DATA=false docker compose up`. |
| `APP_TIMEZONE` | JVM default | Time zone that decides what "today" is for the no-future-dates rules and which day and time of day a step count falls in, for example `America/Los_Angeles`. The containers run in UTC, so set this if you are far from UTC. |
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

Backend packages under `com.novellia.pets`: `pet`, `record`, `steps`, `dashboard`, `common` (error handling, clock, store lock, sorting) and `demo` (demo data, including the step data generator). The app shell (toolbar, routes, providers) is in `src/app` itself, as `app.ts`, `app.html`, `app.routes.ts` and `app.config.ts`. Frontend folders under `src/app`: `core` (interceptors, notifier, date and form helpers, the not-found page), `shared` (including the form dialog helpers), `models`, and `features/{dashboard,pets,records,steps}`. See [frontend/README.md](frontend/README.md) for how the frontend is organised.

## API at a glance

JSON over REST under `/api`, with UUID identifiers and `yyyy-MM-dd` dates.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/pets?q=&species=&sort=` | List pets. `species` can repeat. `sort` is one of `name`, `createdAt`, `dateOfBirth` plus `,asc` or `,desc` |
| POST | `/api/pets` | Create a pet |
| GET, PUT, DELETE | `/api/pets/{petId}` | Get, replace or delete a pet (deleting also deletes its records and steps) |
| GET | `/api/pets/{petId}/records?q=&type=&sort=` | List a pet's records. `sort` is one of `recordDate`, `type`, `title` |
| POST | `/api/pets/{petId}/records` | Create a record |
| GET, PUT, DELETE | `/api/pets/{petId}/records/{recordId}` | Get, replace or delete a record |
| GET | `/api/pets/{petId}/steps/daily?days=30` | Daily step totals for the last `days` days (1 to 366), with today marked partial, and the 7-day average. `tracked` is false for a pet without step data |
| GET | `/api/pets/{petId}/steps/profile` | A typical day: for each 10-minute slot, the 5th, 25th, 50th, 75th and 95th percentile of steps over the last 14 complete days |
| GET | `/api/dashboard` | Totals, breakdowns, per-pet summary (including the 7-day step average) and the five newest records |

Pet responses and the dashboard's per-pet summary include `averageDailySteps`: the mean over the last seven complete days (today is left out because it is still in progress), or `null` for a pet without a tracker.

Errors share one body: `{"status": 400, "message": "Validation failed", "errors": {"name": "must not be blank"}}`. Unknown ids, and a record id under the wrong pet, return 404. Unknown sort fields and enum values return 400.

## Manual smoke checklist

There are no browser end-to-end tests, so run through this once after a change:

1. Open the dashboard. With demo data you see 3 pets, 8 records and activity in the last 30 days. Biscuit and Miso show a 7-day step average and Pancake shows "No tracker".
2. In Recent activity, click a pet's name and check it opens that pet. Go back and click elsewhere in a row, and the record opens in its read view.
3. Add a pet from the Pets page. It opens in a dialog. Pick species Other and check that a "What kind of animal?" field appears and is required. Change species away from Other and the field disappears. Save, and you land on the new pet's page, which shows "Other (your description)".
4. Start adding another pet, type something, then click outside the dialog or press Escape. You are asked before your changes are thrown away. With no changes it just closes.
5. Add a medical record to your pet. Try a date in the future and a date before the birth date and check both are refused.
6. Click the record's row. It opens read only, with Edit and Delete buttons. Click Edit, change something, click Cancel, and the read view shows the original values. Edit again and save.
7. Edit the pet from its page and from the menu on its card in the Pets list. Change it from Other to Dog and check the description is gone.
8. On the pets list, search by name, breed and the Other description, use the species chips and the sort menu, then clear the filters. Biscuit's and Miso's cards show their 7-day step average.
9. Open Biscuit. The Steps card shows a column chart. Switch between Month (days), 3 months (weeks) and Year (months), and hover the columns. The average beside the heading changes with the range. Below it, the Typical day chart shows walk peaks around 7 AM, midday and 6 PM. Hover it to see the percentiles.
10. Open Miso. The Month view shows a sharp drop about 20 days ago (the sprain in Miso's records) and a gradual recovery. Open Pancake. There are no step charts.
11. On the pet page, search the records, use the type chips and click the Date, Type and Title headers.
12. Delete a record, then delete the pet. The confirmation names the pet and how many records go with it.
13. Refresh the page after each step above. Everything you did is still there.
14. Restart the API (`docker compose restart api`). The data returns to the demo data, which is expected because the store is in memory.
15. Narrow the window to phone width (under 600 px). The toolbar links collapse into a menu, the pet and record dialogs go full screen, and the step charts fit the width.
