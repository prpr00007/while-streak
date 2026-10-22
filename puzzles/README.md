# Weekly puzzles

Each file here is one week: 7 days × 4 formats = 28 puzzles, named by the week's first day (`2026-10-29.json`). Puzzle numbers come from the date and `LAUNCH_DATE` in `src/lib/date.ts`, so you never write them.

## Adding next week

1. Copy the latest file to the next week's start date and replace the puzzles. Keep the dates consecutive with no gaps.
2. Run the checker until it says `all good`:
   ```bash
   python3 scripts/check_puzzles.py puzzles/2026-10-29.json
   ```
3. Open a pull request. The **Puzzles** workflow runs the checker on it.
4. Merge. The workflow publishes to Supabase, and each puzzle unlocks on its date (row-level security hides future rows from players).

Every Monday the workflow fails if fewer than 7 days are scheduled, so GitHub emails you a reminder. Puzzles from past days are never re-sent; fix a live puzzle in Supabase directly if you have to.

## What the checker runs

The checker executes every puzzle in Python, so each one needs `tests` (Python statements, usually `assert`s, run after the code in one namespace; earlier statements can define helpers).

| Format | Must be true |
| --- | --- |
| `order` | The `solution` passes the tests. Swapping any two lines fails. Putting the decoy in any slot fails. |
| `bug` | The lines as shown fail at least one test. With `fix` replacing line `bug`, every test passes. |
| `output` | Running `lines` prints exactly `choices[answer]` (or raises, if the answer is `"Error"`). No tests needed. |
| `fill` | Only `choices[answer]` in the `___` makes every test pass. |

If the checker says two Order lines can swap, merge them into one line (`a, b = 0, 0`) or add a test that tells the orders apart.

## Fields

Every puzzle has `date`, `format`, `title`, `prompt`, `lines`, `why`. `prompt` and `why` render `` `backticks` `` as code. `lines` are `{"text", "indent"}` (indent in levels, not spaces).

```json
{"date": "2026-10-29", "format": "order", "title": "...", "prompt": "Order the lines so ... One line doesn’t belong.",
 "lines": [{"id": "a", "text": "def f(xs):", "indent": 0}, {"id": "x", "text": "decoy", "indent": 1}],
 "solution": ["a", "..."], "why": "...", "tests": ["assert f([1]) == 1"]}

{"date": "2026-10-29", "format": "bug", "title": "...", "prompt": "... One line is wrong.",
 "lines": [{"text": "def f(n):", "indent": 0}, {"text": "return n * 3", "indent": 1}],
 "bug": 1, "fix": "return n * 2", "hint": "Try `f(2)`.", "why": "...", "tests": ["assert f(2) == 4"]}

{"date": "2026-10-29", "format": "output", "title": "...", "prompt": "What does this print?",
 "lines": [{"text": "print(2 ** 3)", "indent": 0}], "choices": ["6", "8", "9", "Error"], "answer": 1, "why": "..."}

{"date": "2026-10-29", "format": "fill", "title": "...", "prompt": "... Fill the blank.",
 "lines": [{"text": "def double(n):", "indent": 0}, {"text": "return n ___ 2", "indent": 1}],
 "choices": ["+", "*", "-", "**"], "answer": 1, "hint": "...", "why": "...", "tests": ["assert double(3) == 6"]}
```

Tips: vary which slot (A-D) holds the answer; keep Order and Bug Hunt to about 12 lines so they fit on a phone; avoid repeating a topic in two formats on the same day.

The bundled puzzles in `src/data/` are only the offline fallback and don't need to change each week.
