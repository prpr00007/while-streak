# while(streak)

A daily coding puzzle game. Everyone gets the same puzzles each day, keeps a streak going, and shares a Wordle-style grid. Each day has two puzzles:

- **Order**: put shuffled lines of code back in order, with one decoy line mixed in. 4 tries.
- **Bug Hunt**: one line of a short function is wrong. Select it and check. 3 tries; a hint unlocks after the first miss, and the fix is shown as a diff at the end.

The streak counts days where you solved at least one of the two. Losing both resets it.

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

Without Supabase keys the app runs fully offline: puzzles come from `src/data/fallbackPuzzles.ts` and `src/data/fallbackBugPuzzles.ts`, and streaks and stats are stored on the device.

## Turn on leaderboards (optional sign-in)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Authentication: keep the Email provider on. In **Email Templates > Magic Link**, include `{{ .Token }}` in the body so players get a 6-digit code (the app signs in with a code, no deep links needed).
4. Copy `.env.example` to `.env`, fill in your project URL and anon key, and restart `npx expo start`.

Players can play and keep streaks without an account. Signing in (email code) plus picking a username puts their daily score on the leaderboard. A result finished before signing in is uploaded automatically after they sign in.

## How puzzles are scheduled

- `LAUNCH_DATE` in `src/lib/date.ts` is puzzle #1. Each day after is the next number.
- The app asks Supabase for today's number in each format (`puzzles` is keyed by `number` + `format`); if there's no row, it falls back to the bundled puzzles in rotation.
- Every player sees the same shuffle (seeded by the puzzle number).
- Writing an Order puzzle: each one needs exactly one correct order plus one decoy line. Watch for pairs of lines that could legally swap (like `a = 0` and `b = 0`); merge them into one line (`a, b = 0, 0`) or the grader will mark a valid answer wrong.
- Writing a Bug Hunt puzzle: exactly one line is wrong, and replacing it with `fix` must make the function correct. Avoid bugs that span two lines or that could be fixed by editing a different line, or players who pick that line are marked wrong. The `hint` should point at a failing input without naming the line. In Supabase, `solution` is `{ "bug": <0-based line>, "fix": "<corrected line>" }`.

## Project map

```
app/_layout.tsx          navigation, fonts, theme, native splash
app/index.tsx            home: boot screen, today's two puzzles and their status
app/order.tsx            Order puzzle
app/bug.tsx              Bug Hunt puzzle
app/leaderboard.tsx      today's ranking per format (solved, then fewest tries, then time)
app/account.tsx          optional email sign-in + username
src/game/orderEngine.ts  Order logic (place, check, lock, share text)
src/game/bugEngine.ts    Bug Hunt logic (guess, grid, share text)
src/data/                7 bundled puzzles per format
src/components/          shared UI (retro buttons, labels, cursor), result card, boot screen
src/lib/                 dates, storage (per-format saves/stats, shared streak), Supabase, results
supabase/                schema + seed
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
