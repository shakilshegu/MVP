# Rota — restaurant staff scheduling

React + TypeScript + Vite + Tailwind. English and German.

## Run it

```bash
npm install
npm run dev        # demo mode: dummy data in the browser, no server needed
npm run dev:api    # real backend mode (shows "can't connect" until the API exists)
```

| Script | What it does |
| --- | --- |
| `npm run dev` / `npm run build` | Demo mode (`VITE_DATA_SOURCE=mock`) |
| `npm run dev:api` / `npm run build:api` | API mode (`VITE_DATA_SOURCE=api`, from `.env.api`) |

Settings for your own machine go in `.env.local` (see `.env.example`). Never commit secrets.

## Demo data vs. real backend

There is one front-end. Only the data source changes:

```
            ┌── mock → demo data in the browser (src/data/mock.ts)
Screens ────┤
            └── api  → real backend (src/data/api.ts)
```

Screens never fetch data themselves. They use the store (`src/lib/store.tsx`), which loads through
the selected backend (`src/data`). Connecting the real API means implementing `src/data/api.ts`
and moving store actions to server calls, without touching the screens. Demo mode keeps working for
client demos throughout.

## Branches

| Branch / tag | Purpose |
| --- | --- |
| `main` | Stable client demo. Only merge finished, tested work. |
| `develop` | Backend and API integration. Feature branches (`feature/…`) merge here. |
| `demo-v1` (tag) | The original demo, frozen. `git checkout demo-v1` restores it. |

## Where things are

| Path | Contents |
| --- | --- |
| `src/screens` | Pages (schedule, team, leave, settings, platform…) |
| `src/components` | Shared UI |
| `src/lib/store.tsx` | App state, actions, company scoping |
| `src/lib/validation.ts` | Scheduling rules (availability, rest time, max hours…) |
| `src/i18n` | Translations (`en.ts` is the source; `de.ts` must match it) |
| `src/data` | Data sources: mock and API |
