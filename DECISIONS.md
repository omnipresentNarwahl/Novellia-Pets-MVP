# Decisions, assumptions and limitations

This file explains the choices behind the build. The implementation plan is the source of truth for scope. Where the plan points to a companion document ("Decisions and Alternatives"), see the note at the end.

## Scope

In: pets and medical records (add, view, edit, delete), a dashboard, search and filtering on both lists, one-command startup, demo data, tests and a README.

Out: authentication and authorization, the extra feature the brief asks for (including reminders and due dates), offline use and PWA, photos and attachments, a database, pagination and production hardening.

## Decisions

| Decision | Why | Cost |
| --- | --- | --- |
| In-memory store behind `PetRepository` and `RecordRepository` | The brief only requires data to survive a page refresh. No database means one-command startup and fast tests. Services see only the interfaces, so a database or JSON-file implementation can replace the in-memory classes without touching them. | Data is lost when the API restarts. Demo data is reloaded each time, so the app never starts blank. |
| Filtering, sorting and dashboard numbers computed in the service layer | Repositories stay simple (find, save, delete), and a later database implementation would not need to reimplement the rules. | Everything is read into memory per request. Fine for tens of pets and hundreds of records, not for more. |
| One read-write `StoreLock` around operations that touch both repositories | A record cannot be added to a pet that is being deleted, and the dashboard and pet list read a consistent snapshot. | One global lock. Fine for one user at a time. |
| Immutable Java records for models and DTOs, with separate request and response types | A client can never set `id` or `createdAt`. An update stores a new object, so a reader never sees a half-updated one. | A little more mapping code. |
| Request strings trimmed in the DTO constructors | Bean Validation then sees the trimmed value, so "1 to 100 characters after trimming" is enforced with ordinary annotations. Blank optional strings become null. | None worth noting. |
| Date rules in the service with an injected `Clock`, not `@PastOrPresent` | Tests can fix the date, and the rules that depend on other data (birth date against records) live in the same place. | The server decides what "today" is. See limitations. |
| `speciesOther` for the Other species | The species list stays fixed, and a typed description such as "axolotl" is searchable and shown as "Other (axolotl)". The service stores null for any other species, so changing a pet from Other to Dog cannot leave a stale description. | Two fields instead of one. |
| nginx proxies `/api` to the API, and `ng serve` does the same in development | The browser sees one origin, so no CORS configuration is needed. | The API is only reachable by the browser through the proxy unless its port is also published, which Compose does for convenience. |
| Server is the source of truth, no client store or cache | Pages load on entry and reload after any write. Fewer places for stale data to hide. | One extra request after each write. |
| Hand-written TypeScript interfaces for API models | No code generation step. | They can drift from the API, so keep them in step when changing DTOs. |
| Angular signals with `toObservable` and `switchMap` for filters | A newer request cancels an older one in flight, and typing is debounced by 300 ms. | None worth noting. |
| Species icons are emoji, record type icons are Material icons | No extra icon assets, and the record type chip always shows text as well as an icon. | Emoji look different on each platform. |
| Fonts and icons come from npm packages, not a CDN | The app works with no internet access once built. | A slightly larger build. |

## Assumptions

- There is a single implicit user, so pets have no owner column until authentication is added.
- A medical record describes something that already happened, so its date cannot be in the future. It also cannot be before the pet's date of birth, and a pet's date of birth cannot be after its earliest record.
- Dates are calendar dates with no time of day or time zone. The UI builds `yyyy-MM-dd` from local year, month and day and never uses `toISOString` on a picked date.
- Data volume is small (tens of pets, hundreds of records), so lists are not paginated.
- Species comes from a fixed list. Breed is free text.
- One user works at a time. Concurrent edits are last write wins.
- Searching is a case-insensitive substring match. It matches pet name, breed and the Other description, or record title, provider and notes.

## Known limitations

- **Data is lost on API restart.** This is by design. See the optional JSON snapshot extra in the plan for a way to keep it.
- **"Today" is decided by the server.** If the browser is in a time zone ahead of the server, picking today's date can be refused near midnight because the server still thinks it is yesterday. Set `APP_TIMEZONE` to the time zone people actually use. The containers default to UTC.
- **No authentication.** Anyone who can reach the app can see and change everything.
- **No pagination.** Lists load in full.
- **No browser end-to-end tests.** There are backend service and API tests, and frontend pipe, helper and component tests, plus the manual smoke checklist in the README.
- **Angular 21, not 22.** The newest Angular CLI at the time of the build asked for a newer Node patch release than the build machine had, so the workspace uses the Angular 21 line, which supports Node 20.19+ and 22.12+. Moving to the newest release is an `ng update` away.
- **`legacy-peer-deps` is set in `frontend/.npmrc`.** A clean `npm install` on the build machine hit an npm resolver bug, and the flag avoids it. It is committed so `npm ci` in Docker behaves the same.

## Open questions

- Should the extra feature from the brief (reminders and due dates were mentioned) be the next thing built? It would add a due date to records and a "due soon" panel on the dashboard.
- Should data survive restarts? The JSON snapshot extra is small, needs a Docker volume, and changes no services.
- Which time zone should the deployed server use?
- Does a pet need a way to be archived instead of deleted, for example after it passes away, so the history is kept?

## Authentication approach

Authentication is not implemented. The code is kept simple enough that adding it is a contained change.

What exists now: every request is treated as coming from one implicit user. All data access goes through the services and repository interfaces, so there is one place to add an ownership check. The frontend reaches the API only through its feature services, so a bearer token can be attached in one HTTP interceptor.

Steps to add it:

1. Add an `Owner` model and an `ownerId` field on `Pet`. Records inherit ownership through their pet.
2. Add a `CurrentOwnerProvider` interface that returns the signed-in owner, and scope every pet and record query by that owner. Another owner's data returns 404, so its existence is not revealed.
3. Add Spring Security as an OAuth2 resource server that validates JWTs from an OIDC provider such as Keycloak, Auth0 or Cognito. Read the subject claim and find or create the matching owner.
4. In Angular, sign in with the authorization code flow and PKCE using an OIDC client library, keep tokens in memory, attach the access token in a functional interceptor, guard the routes, and send the user to sign-in on a 401.
5. Add tests showing one owner cannot read, change or delete another owner's pets or records.
6. For shared access (family members, a sitter, a vet), replace the single owner check with a membership table of pet, user and role, checked in the same place.

## Earlier PostgreSQL plan

The implementation plan mentions an earlier plan that used PostgreSQL. That plan and the "Decisions and Alternatives" companion document were not available when this was written, so their reasoning is not reproduced here. Add it from the companion document if you want this file to be self-contained. The repository interfaces are the seam where a database-backed implementation would plug in.
