#!/usr/bin/env python3
"""Validate the weekly puzzle files in puzzles/.

Checks structure, scheduling, and behavior: every puzzle's code is actually run.
  order   the solution passes its tests; no swap of two lines and no placement of the decoy also passes
  bug     the buggy function fails at least one test; with `fix` swapped in, every test passes
  output  running the snippet prints exactly choices[answer], and no other choice
  fill    only choices[answer] in the blank makes every test pass

Usage:
  python3 scripts/check_puzzles.py                  # check every file in puzzles/
  python3 scripts/check_puzzles.py puzzles/X.json   # check specific files (dates are still checked against all files)
  python3 scripts/check_puzzles.py --ahead 7        # also fail unless puzzles are scheduled 7+ days past today
Standard library only. Exits non-zero on any problem.
"""
import argparse
import contextlib
import datetime as dt
import io
import itertools
import json
import re
import signal
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUZZLE_DIR = ROOT / 'puzzles'
FORMATS = ['order', 'bug', 'output', 'fill']
MAX_ID_LINES = 14
TIMEOUT_S = 2


def launch_date() -> dt.date:
    """LAUNCH_DATE from the app, so puzzle numbers here always match what the app computes."""
    src = (ROOT / 'src/lib/date.ts').read_text()
    m = re.search(r"LAUNCH_DATE\s*=\s*'(\d{4}-\d{2}-\d{2})'", src)
    if not m:
        sys.exit('Could not find LAUNCH_DATE in src/lib/date.ts')
    return dt.date.fromisoformat(m.group(1))


def puzzle_number(date: dt.date) -> int:
    return (date - launch_date()).days + 1


def load_files(paths):
    out = []
    for path in paths:
        try:
            data = json.loads(Path(path).read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError) as e:
            out.append((Path(path), None, f'cannot read: {e}'))
            continue
        out.append((Path(path), data, None))
    return out


# --- running puzzle code ---------------------------------------------------------------

class Timeout(Exception):
    pass


def _alarm(_sig, _frame):
    raise Timeout()


def source(lines):
    return '\n'.join('    ' * l['indent'] + l['text'] for l in lines)


def run(code, tests=(), capture=False):
    """Run code then each test in one fresh namespace. Returns (ok, stdout_or_error)."""
    ns = {'__name__': 'puzzle'}
    buf = io.StringIO()
    signal.signal(signal.SIGALRM, _alarm)
    signal.alarm(TIMEOUT_S)
    try:
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(io.StringIO()):
            exec(compile(code, '<puzzle>', 'exec'), ns)
            for t in tests:
                exec(compile(t, '<test>', 'exec'), ns)
        return True, buf.getvalue()
    except Timeout:
        return False, 'timed out'
    except BaseException as e:  # SyntaxError, AssertionError, SystemExit, anything the snippet raises
        return False, type(e).__name__ + (f': {e}' if str(e) else '')
    finally:
        signal.alarm(0)


def passes(lines, tests):
    return run(source(lines), tests)[0]


# --- per-format checks -------------------------------------------------------------------

def need(p, keys, errs):
    for k, kind in keys.items():
        if k not in p:
            errs.append(f'missing "{k}"')
        elif not isinstance(p[k], kind):
            errs.append(f'"{k}" should be {kind.__name__ if isinstance(kind, type) else "/".join(t.__name__ for t in kind)}')


def check_lines(lines, errs, with_ids=False):
    for i, l in enumerate(lines):
        if not isinstance(l, dict) or not isinstance(l.get('text'), str) or not isinstance(l.get('indent'), int) or l['indent'] < 0:
            errs.append(f'line {i + 1} needs "text" (string) and "indent" (int >= 0)')
        elif with_ids and not isinstance(l.get('id'), str):
            errs.append(f'line {i + 1} needs an "id"')


def check_order(p, errs):
    need(p, {'lines': list, 'solution': list, 'tests': list}, errs)
    if errs:
        return
    check_lines(p['lines'], errs, with_ids=True)
    if errs:
        return
    by_id = {l['id']: l for l in p['lines']}
    if len(by_id) != len(p['lines']):
        return errs.append('line ids must be unique')
    if len(set(p['solution'])) != len(p['solution']) or not set(p['solution']) <= set(by_id):
        return errs.append('solution must list distinct ids that exist in lines')
    decoys = [i for i in by_id if i not in p['solution']]
    if len(decoys) != 1:
        return errs.append(f'needs exactly one decoy line (not in solution); found {len(decoys)}')
    if len(p['lines']) > MAX_ID_LINES:
        errs.append(f'too many lines ({len(p["lines"])}); keep it to {MAX_ID_LINES} so it fits on a phone')
    sol = [by_id[i] for i in p['solution']]
    ok, err = run(source(sol), p['tests'])
    if not ok:
        return errs.append(f'the solution fails its tests: {err}')
    # Any other arrangement a player could submit must fail, or the grader marks a valid answer wrong.
    for a, b in itertools.combinations(range(len(sol)), 2):
        alt = sol.copy()
        alt[a], alt[b] = alt[b], alt[a]
        if alt[a]['text'] != alt[b]['text'] and passes(alt, p['tests']):
            errs.append(f'swapping lines {a + 1} and {b + 1} also passes the tests; merge them into one line or add a test that tells them apart')
    decoy = by_id[decoys[0]]
    for i in range(len(sol)):
        if passes(sol[:i] + [decoy] + sol[i + 1:], p['tests']):
            errs.append(f'the decoy in place of line {i + 1} also passes the tests')


def check_bug(p, errs):
    need(p, {'lines': list, 'bug': int, 'fix': str, 'hint': str, 'tests': list}, errs)
    if errs:
        return
    check_lines(p['lines'], errs)
    if errs:
        return
    if not 0 <= p['bug'] < len(p['lines']):
        return errs.append('"bug" must be a 0-based index into lines')
    if p['fix'] == p['lines'][p['bug']]['text']:
        return errs.append('"fix" is the same as the buggy line')
    fixed = [dict(l) for l in p['lines']]
    fixed[p['bug']]['text'] = p['fix']
    ok, err = run(source(fixed), p['tests'])
    if not ok:
        errs.append(f'with the fix applied, the tests fail: {err}')
    if passes(p['lines'], p['tests']):
        errs.append('the buggy version passes every test, so nothing shows the bug; add a test that fails')


def check_choices(p, errs):
    if not (isinstance(p.get('choices'), list) and len(p['choices']) == 4 and all(isinstance(c, str) and c for c in p['choices'])):
        return errs.append('"choices" must be 4 non-empty strings')
    if len(set(p['choices'])) != 4:
        errs.append('choices must be distinct')
    if not (isinstance(p.get('answer'), int) and 0 <= p['answer'] < 4):
        errs.append('"answer" must be 0-3')


def check_output(p, errs):
    need(p, {'lines': list}, errs)
    check_choices(p, errs)
    if errs:
        return
    check_lines(p['lines'], errs)
    if errs:
        return
    ok, out = run(source(p['lines']))
    printed = out.rstrip('\n') if ok else 'Error'
    if printed != p['choices'][p['answer']]:
        errs.append(f'it actually prints {printed!r}, not the answer {p["choices"][p["answer"]]!r}' + ('' if ok else f' ({out})'))


def check_fill(p, errs):
    need(p, {'lines': list, 'hint': str, 'tests': list}, errs)
    check_choices(p, errs)
    if errs:
        return
    check_lines(p['lines'], errs)
    if errs:
        return
    blanks = sum(l['text'].count('___') for l in p['lines'])
    if blanks != 1:
        return errs.append(f'exactly one line must contain a single "___" blank; found {blanks}')
    working = [i for i, c in enumerate(p['choices'])
               if passes([dict(l, text=l['text'].replace('___', c)) for l in p['lines']], p['tests'])]
    if working != [p['answer']]:
        letters = ', '.join('ABCD'[i] for i in working) or 'none'
        errs.append(f'choices that pass the tests: {letters}; it must be exactly {"ABCD"[p["answer"]]}')


CHECKS = {'order': check_order, 'bug': check_bug, 'output': check_output, 'fill': check_fill}


def check_puzzle(p):
    errs = []
    if p.get('format') not in FORMATS:
        return [f'"format" must be one of {FORMATS}']
    for k in ('title', 'prompt', 'why'):
        if not (isinstance(p.get(k), str) and p[k].strip()):
            errs.append(f'"{k}" must be a non-empty string')
    if 'tests' in p and not all(isinstance(t, str) for t in p['tests']):
        errs.append('"tests" must be strings of Python')
    if not errs:
        CHECKS[p['format']](p, errs)
    return errs


# --- whole-schedule checks ---------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='*', help='week files to check (default: all of puzzles/*.json)')
    ap.add_argument('--ahead', type=int, default=0, help='fail unless every format is scheduled at least this many days past today')
    args = ap.parse_args(argv)

    all_paths = sorted(PUZZLE_DIR.glob('*.json'))
    targets = {Path(f).resolve() for f in args.files} if args.files else {p.resolve() for p in all_paths}
    launch = launch_date()
    problems = 0
    seen = {}  # (date, format) -> file
    checked = 0

    def report(where, msg):
        nonlocal problems
        problems += 1
        print(f'  x {where}: {msg}')

    for path, data, err in load_files(sorted(set(all_paths) | targets)):
        name = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
        if err:
            report(name, err)
            continue
        if not isinstance(data, dict) or not isinstance(data.get('puzzles'), list):
            report(name, 'top level must be {"week_of": "YYYY-MM-DD", "puzzles": [...]}')
            continue
        in_file = {}
        for i, p in enumerate(data['puzzles']):
            where = f'{name} #{i + 1} {p.get("date", "?")} {p.get("format", "?")} "{p.get("title", "?")}"'
            try:
                date = dt.date.fromisoformat(p.get('date', ''))
            except (TypeError, ValueError):
                report(where, '"date" must be YYYY-MM-DD')
                continue
            if date < launch:
                report(where, f'date is before LAUNCH_DATE {launch}')
            key = (date, p.get('format'))
            if key in seen:
                report(where, f'another {key[1]} puzzle is already scheduled on {date} in {seen[key]}')
            seen[key] = name
            in_file.setdefault(date, set()).add(p.get('format'))
            if path.resolve() in targets:
                for msg in check_puzzle(p):
                    report(where, msg)
                checked += 1
        if path.resolve() in targets:
            for date, fmts in sorted(in_file.items()):
                missing = [f for f in FORMATS if f not in fmts]
                if missing:
                    report(name, f'{date} has no {", ".join(missing)} puzzle')

    # Gaps: every day from launch to the last scheduled day should have all four formats.
    if seen:
        last = max(d for d, _ in seen)
        day = launch
        while day <= last:
            for f in FORMATS:
                if (day, f) not in seen:
                    report('schedule', f'no {f} puzzle on {day} (the app will fall back to a bundled one)')
            day += dt.timedelta(days=1)
        covered = min(max((d for d, ff in seen if ff == f), default=launch - dt.timedelta(days=1)) for f in FORMATS)
        ahead = (covered - dt.date.today()).days
        print(f'Scheduled through {covered} (No. {puzzle_number(covered)}), {ahead} day(s) from today.')
        if args.ahead and ahead < args.ahead:
            report('schedule', f'only {ahead} day(s) of puzzles left; add next week\'s file (need {args.ahead})')

    print(f'Checked {checked} puzzle(s): ' + ('all good.' if not problems else f'{problems} problem(s).'))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
