# while(streak)

A daily coding puzzle game. Everyone gets the same puzzles each day, keeps a streak going, and shares a Wordle-style grid. Each day has four puzzles:

- **Order**: put shuffled lines of code back in order, with one decoy line mixed in. 4 tries.
- **Bug Hunt**: one line of a short function is wrong. Select it and check. 3 tries; a hint unlocks after the first miss, and the fix is shown as a diff at the end.
- **Output**: read a snippet and pick what it prints from 4 choices. One shot, then the real output and why.
- **Fill**: one token is missing from a working function. Pick it from 4 chips; it previews in the blank. 3 tries, with a hint after the first miss.

The streak counts days where you solved at least one of the four. Losing all four resets it.

Stack: Expo (React Native, iOS + Android) with expo-router, and Supabase (optional) for puzzles, sign-in, and leaderboards.

## Run it on your phone

1. Install Node.js (LTS) and the **Expo Go** app on your phone.
2. In this folder:
   ```bash
   npm install
   npx expo install expo@latest   # moves to the SDK your Expo Go supports
   npx expo install --fix         # aligns every Expo package to that SDK
   npx expo start
   ```
3. Scan the QR code with your phone camera (iOS) or Expo Go (Android).

Without Supabase keys the app runs fully offline: puzzles come from the files in `src/data/`, and streaks and stats are stored on the device.

## Turn on leaderboards (optional sign-in)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql` (generated from `puzzles/`; it loads every puzzle written so far).
3. Authentication: keep the Email provider on. In **Email Templates > Magic Link**, include `{{ .Token }}` in the body so players get a 6-digit code (the app signs in with a code, no deep links needed).
4. Copy `.env.example` to `.env`, fill in your project URL and anon key, and restart `npx expo start`.

Players can play and keep streaks without an account. Signing in (email code) plus picking a username puts their daily score on the leaderboard. A result finished before signing in is uploaded automatically after they sign in.

## Weekly puzzles

New puzzles live in `puzzles/`, one JSON file per week. `puzzles/README.md` has the format and the routine:

```bash
python3 scripts/check_puzzles.py              # runs every puzzle's code and checks the schedule
python3 scripts/publish_puzzles.py --dry-run  # what would be sent to Supabase
python3 scripts/publish_puzzles.py --sql > supabase/seed.sql   # regenerate the seed
```

The **Puzzles** GitHub Action checks pull requests, publishes to Supabase on merge to `main`, and fails every Monday if next week isn't scheduled yet. To turn on publishing, add two repository secrets (GitHub: Settings > Secrets and variables > Actions): `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase: Project Settings > API, the `service_role` key). That key bypasses row-level security, so it only ever goes in CI secrets, never in `.env` or the app.

## How puzzles are scheduled

- `LAUNCH_DATE` in `src/lib/date.ts` is puzzle #1. Each day after is the next number.
- The app asks Supabase for today's number in each format (`puzzles` is keyed by `number` + `format`); if there's no row, it falls back to the bundled puzzles in rotation.
- Every player sees the same shuffle (seeded by the puzzle number).
- Writing an Order puzzle: each one needs exactly one correct order plus one decoy line. Watch for pairs of lines that could legally swap (like `a = 0` and `b = 0`); merge them into one line (`a, b = 0, 0`) or the grader will mark a valid answer wrong.
- Writing a Bug Hunt puzzle: exactly one line is wrong, and replacing it with `fix` must make the function correct. Avoid bugs that span two lines or that could be fixed by editing a different line, or players who pick that line are marked wrong. The `hint` should point at a failing input without naming the line. In Supabase, `solution` is `{ "bug": <0-based line>, "fix": "<corrected line>" }`.
- Writing an Output puzzle: the snippet must print exactly one of the 4 choices, and the choices should be distinct plausible misreadings. Vary which slot holds the answer.
- Writing a Fill puzzle: exactly one line contains `___`; the answer token must make the function correct and every other choice must break it. In Supabase, both use `solution = { "choices": [...], "answer": <index> }`, and Fill also uses `hint`.

## Project map

```
app/_layout.tsx          navigation, fonts, theme, native splash
app/index.tsx            home: boot screen, today's four puzzles and their status
app/order.tsx            Order puzzle
app/bug.tsx              Bug Hunt puzzle
app/output.tsx, fill.tsx Output and Fill puzzles (both use src/components/ChoiceGameScreen.tsx)
app/leaderboard.tsx      today's ranking per format (solved, then fewest tries, then time)
app/account.tsx          optional email sign-in + username
src/game/orderEngine.ts  Order logic (place, check, lock, share text)
src/game/bugEngine.ts    Bug Hunt logic (guess, grid, share text)
src/game/choiceEngine.ts Output and Fill logic (multiple choice, tries per format)
src/data/                7 bundled puzzles per format
src/components/          shared UI (retro buttons, labels, cursor), result card, boot screen
src/lib/                 dates, storage (per-format saves/stats, shared streak), Supabase, results
puzzles/                 one JSON file per week, with tests; source of truth for Supabase
scripts/                 check_puzzles.py (validate + run), publish_puzzles.py (upload, seed)
.github/workflows/       Puzzles: check PRs, publish on merge, weekly reminder
supabase/                schema + generated seed
```

## Known limits before a public launch

- Solutions ship to the client and results are graded on the phone, so a determined player could fake a leaderboard score. Before leaderboards matter, move grading into a Supabase Edge Function that receives each attempt and returns the green/gray row.
- No app icon or splash yet (Expo defaults are used). Add `icon` and `splash` to `app.json`.

## Ship to the stores

```bash
npm i -g eas-cli
eas build --platform ios      # needs an Apple Developer account ($99/yr)
eas build --platform android  # Google Play is a one-time $25
eas submit
```
