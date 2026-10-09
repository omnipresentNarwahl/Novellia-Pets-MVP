# Frontend

The Angular 21 app for Novellia Pets. See the [root README](../README.md) for how to run the whole project, the API, and the manual smoke checklist.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (`legacy-peer-deps` is set in `.npmrc`, see DECISIONS.md) |
| `npx ng serve` | Dev server on <http://localhost:4200>, proxying `/api` to `localhost:8081` (`proxy.conf.json`) |
| `npx ng test --watch=false` | Unit tests with Vitest in jsdom |
| `npx ng build` | Production build into `dist/` |

## Layout of `src/app`

| Folder | Contents |
| --- | --- |
| `./` (`src/app` itself) | The app shell: `app.ts` and `app.html` (toolbar, loading bar), `app.routes.ts`, `app.config.ts` (providers) |
| `core/` | App-wide pieces: HTTP interceptors (loading bar, error snackbars), notifier, date and form-error helpers, the not-found page |
| `models/` | TypeScript interfaces matching the API. Keep them in step with the backend DTOs |
| `shared/` | Reusable components and pipes: confirm dialog, form dialog helpers (`form-dialog.ts`), empty state, species icon, record type chip, age pipe |
| `features/dashboard/` | Dashboard page |
| `features/pets/` | Pets list, pet page, and the add and edit pet dialog |
| `features/records/` | Record dialog (read, edit and add) and its service |
| `features/steps/` | Steps service, the step column chart and its day, week and month grouping (`step-columns.ts`), and the typical-day chart |

## Conventions

- Standalone components, signals for state, and typed reactive forms. Lists reload from the server after any change; there is no client-side store.
- Data loads with `toObservable` and `switchMap`, so a newer request cancels an older one.
- Pets and records are added and edited in dialogs opened with `formDialogConfig`. A dialog that holds a form calls `confirmCloseWhenDirty(form)` in its constructor, so a click outside or Escape asks before throwing away changes.
- Charts are plain SVG components with no chart library. They size themselves with `hostWidth()`, show a tooltip on hover, and include a visually hidden table for screen readers.
- Tests sit next to the code as `*.spec.ts`.
