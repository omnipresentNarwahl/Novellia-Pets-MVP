# Decisions, assumptions and limitations

This file explains the choices behind the build. The implementation plan is the source of truth for scope. Where the plan points to a companion document ("Decisions and Alternatives"), see the note at the end.

## Scope

In: pets and medical records (add, view, edit, delete), a dashboard, search and filtering on both lists, one-command startup, demo data, tests and a README. Added after the first build: a read-only view for records, add and edit pet as a dialog, a prompt before a dialog throws away unsaved changes, and, as the extra feature the brief asks for, step tracking for pets with an activity tracker (a 7-day average, a step chart by day, week or month, and a typical-day chart).

Out: authentication and authorization, reminders and due dates, integration with a real activity tracker (step data is generated), entering or editing step data, offline use and PWA, photos and attachments, a database, pagination and production hardening.

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

### Dialogs

| Decision | Why | Cost |
| --- | --- | --- |
| Records open in a read view first, and editing is a mode of the same dialog | Clicking a row to look at a record should not risk changing it. The read view shows plain text rather than disabled inputs, so it cannot be mistaken for a form. Cancel from an edit started in the read view goes back to the read view. The row's pencil icon still opens straight into edit mode. | Two layouts in one dialog to keep in step. |
| Add and edit pet are a dialog, not pages | They match the record dialog, and the pet page is already the read view, so a separate page added nothing. The `/pets/new` and `/pets/:id/edit` routes and their unsaved-changes route guard were removed. | Those URLs no longer work. `/pets/new` now shows "Not found", because "new" is read as a pet id. |
| A click outside a dialog or Escape asks before throwing away changes. Cancel does not ask. | Clicking outside by accident should not lose work, and a dialog with no changes should still close at once. Cancel is a deliberate choice. One helper, `confirmCloseWhenDirty` in `shared/form-dialog.ts`, does this for both dialogs, and `formDialogConfig` gives both the same size and phone layout. | Material's built-in close on outside click is turned off and handled by the helper instead. |
| On the dashboard, a Recent activity row opens the record, and the pet's name is a separate link to the pet | Both are useful from the same row. The dashboard only has a summary of each record, so opening one fetches the full record and its pet first. Changes made there reload the dashboard. | Two requests before the dialog opens. |

### Step tracking

Step tracking is the extra feature the brief asks for.

| Decision | Why | Cost |
| --- | --- | --- |
| Step data is generated by the demo data loader, not collected from a tracker | This is a demo of the feature. `StepGenerator` makes a year of 10-minute counts for Biscuit and Miso, with quiet nights, walk or play peaks, weekend and seasonal changes, the odd lazy day, and a sharp drop and recovery around Miso's sprain. It is seeded, so the same relative day always gives the same data. | No way to add or change step data, and it is regenerated at every start. |
| Steps stored as 144 ten-minute slots per pet per day, in a separate `StepRepository` | 10-minute detail is what a tracker would provide. A year is about 52,600 numbers per pet (about 210 KB), which is small in memory. A separate repository keeps the pet model unchanged. A pet has a tracker if and only if it has step data. | Deleting a pet has to delete its steps too, which `PetService.delete` does under the store lock. |
| The API only sends summaries, never raw 10-minute data | The browser needs at most a year of daily totals (366 numbers) or a typical-day profile (144 rows of percentiles). | The detail is only available through those two summaries. |
| The 7-day average uses the 7 complete days before today | Today is still in progress, so including it would drag the average down. It is part of the pet response and the dashboard's per-pet summary, and shown on the dashboard and on pet cards. | It is null both for a pet without a tracker and for a tracked pet with no data in the last week, so both read "No tracker". |
| The step chart groups a year of daily totals in the browser into days, weeks or months | Switching between Month (30 days), 3 months (13 Monday-to-Sunday weeks) and Year (12 calendar months) needs no further requests. | The pet page always loads a year of daily totals. |
| Week and month columns show the average steps per day, not the total | The current period is still in progress and the oldest one may be only partly covered, so totals would make them look artificially low. An average also keeps every view on the same "steps per day" scale. Today is left out of averages while the period has complete days. The figure beside the chart heading is the average over the whole range shown. | Readers wanting a weekly or monthly total have to multiply. |
| The typical-day chart follows the ambulatory glucose profile | One 24-hour day with the median and the 25th–75th and 5th–95th percentile bands shows routine and how consistent it is. The server works out the percentiles over the last 14 complete days. Each slot pools the slots on either side (30 minutes, wrapping round midnight), because raw 10-minute percentiles were too spiky to read. | The pooling slightly blurs exact timings. |
| Charts are hand-written SVG components, not a chart library | Two simple charts did not justify a large dependency, and plain SVG matches the Material theme easily. Each chart has a hover tooltip and a hidden table for screen readers. | More code to maintain than a library call. |

## Assumptions

- There is a single implicit user, so pets have no owner column until authentication is added.
- A medical record describes something that already happened, so its date cannot be in the future. It also cannot be before the pet's date of birth, and a pet's date of birth cannot be after its earliest record.
- Dates are calendar dates with no time of day or time zone. The UI builds `yyyy-MM-dd` from local year, month and day and never uses `toISOString` on a picked date.
- Data volume is small (tens of pets, hundreds of records), so lists are not paginated.
- Species comes from a fixed list. Breed is free text.
- One user works at a time. Concurrent edits are last write wins.
- Searching is a case-insensitive substring match. It matches pet name, breed and the Other description, or record title, provider and notes.
- Step counts belong to days and times of day in the server's time zone (`APP_TIMEZONE`), like every other "today" rule.

## Known limitations

- **Data is lost on API restart.** This is by design. See the optional JSON snapshot extra in the plan for a way to keep it.
- **"Today" is decided by the server.** If the browser is in a time zone ahead of the server, picking today's date can be refused near midnight because the server still thinks it is yesterday. Set `APP_TIMEZONE` to the time zone people actually use. The containers default to UTC.
- **No authentication.** Anyone who can reach the app can see and change everything.
- **No pagination.** Lists load in full.
- **Step data is made up.** It is generated at startup for two demo pets and cannot be entered, imported or edited.
- **Chart tooltips need a mouse or touch.** Keyboard users cannot step through columns. Screen readers get a hidden table with the same numbers.
- **No browser end-to-end tests.** There are backend service and API tests, and frontend pipe, helper and component tests, plus the manual smoke checklist in the README.
- **Angular 21, not 22.** The newest Angular CLI at the time of the build asked for a newer Node patch release than the build machine had, so the workspace uses the Angular 21 line, which supports Node 20.19+ and 22.12+. Moving to the newest release is an `ng update` away.
- **`legacy-peer-deps` is set in `frontend/.npmrc`.** A clean `npm install` on the build machine hit an npm resolver bug, and the flag avoids it. It is committed so `npm ci` in Docker behaves the same.

## Possible additions

- Reminders and due dates: Add a due date to records and a "due soon" panel on the dashboard.
- Pet alerts: An alert icon on the pet cards and details page if the pet hasn't been to the vet in over a year or if there has been a recent sharp decrease in average steps.
- Handling deceased pets with a flag rather than deleting so their records remain available.
- Support attaching a tracker data source to a pet and retrieving the data. The `StepRepository` interface is where real data would arrive.
- Handle pets without a tracker and pets with a tracker but no recent data differently.
- Add a database.
- Add authentication.
- End-to-end testing to cover the smoke tests.
- The application assumes the users will be looking at one pet at a time, if they want to do more with the records across all pets we could add search and filter functionality to the dashboard page.
- Show the records in the step chart so it's easy to see how the two things fit together in the timeline.

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
