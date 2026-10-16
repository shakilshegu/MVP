# Rota staff app

The phone app for restaurant staff, built with Flutter (iOS, Android and web). It is the companion to the manager web app in `../restaurant-scheduler`.

## What staff can do

- **Home:** next shift (with shift leader and teammates), hours this week, announcements such as a private party, open shifts they can take, and the availability deadline.
- **Shifts:** their shifts this week and next, and open shifts to pick up. Rota checks the rules first: department, already full, leave, availability, overlap, 11 hours' rest, 10 hours a day and their weekly maximum, and explains why when a shift can't be taken.
- **Checklist:** tick off their duties during the shift (plus extra tasks from the manager). Shift leaders also see their team's progress.
- **Availability:** say which days they can work for coming weeks, before the deadline the owner sets.
- **Me:** gross earnings this week, this month and last month, shift history with checklist results, language (English / German) and sign out.

## Run it

```bash
flutter pub get
flutter run -d chrome        # or an iOS / Android device or emulator
flutter test
```

Demo accounts: `lina@harborhouse.co`, `sofia@harborhouse.co`, `dario@harborhouse.co` (any password). They are the same Harbor House team as the web demo.

## How it is built

- `lib/data/models.dart` mirrors the web app's data model (`restaurant-scheduler/src/lib/types.ts`).
- `lib/data/backend.dart` defines `Backend`, the same idea as the web app's `backend.ts`. `MockBackend` serves demo data; a real `ApiBackend` plugs in later without changing any screen.
- `lib/data/rules.dart` holds the scheduling rules (open shifts, what stops someone taking a shift, deadlines).
- `lib/state/app_state.dart` is the single place screens read from and act through.
- `lib/l10n.dart` has all text in English and German.

## Not yet connected

Demo data lives in memory on the device. Real accounts, push notifications and syncing with the manager app arrive with the backend.
