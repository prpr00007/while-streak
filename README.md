# while(streak)

A daily coding puzzle game. Everyone gets the same puzzle each day, keeps a streak going, and shares a Wordle-style grid. This first build ships one format, **Order**: put shuffled lines of code back in order, with one decoy line mixed in and 4 tries.

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

Without Supabase keys the app runs fully offline: puzzles come from `src/data/fallbackPuzzles.ts`, and streaks and stats are stored on the device.

## Turn on leaderboards (optional sign-in)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Authentication: keep the Email provider on. In **Email Templates > Magic Link**, include `{{ .Token }}` in the body so players get a 6-digit code (the app signs in with a code, no deep links needed).
4. Copy `.env.example` to `.env`, fill in your project URL and anon key, and restart `npx expo start`.

Players can play and keep streaks without an account. Signing in (email code) plus picking a username puts their daily score on the leaderboard. A result finished before signing in is uploaded automatically after they sign in.

## How puzzles are scheduled

- `LAUNCH_DATE` in `src/lib/date.ts` is puzzle #1. Each day after is the next number.
- The app asks Supabase for today's number; if there's no row, it falls back to the bundled puzzles in rotation.
- Every player sees the same shuffle (seeded by the puzzle number).
- Writing a puzzle: each one needs exactly one correct order plus one decoy line. Watch for pairs of lines that could legally swap (like `a = 0` and `b = 0`); merge them into one line (`a, b = 0, 0`) or the grader will mark a valid answer wrong.

## Project map

```
app/_layout.tsx          navigation, fonts, theme
app/index.tsx            today's puzzle
app/leaderboard.tsx      today's ranking (solved, then fewest tries, then time)
app/account.tsx          optional email sign-in + username
src/game/orderEngine.ts  pure game logic (place, check, lock, share text)
src/data/fallbackPuzzles.ts  7 bundled puzzles
src/lib/                 dates, storage (streaks/stats), Supabase, results
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
