import type { OutputPuzzle } from '../types';

type Base = Omit<OutputPuzzle, 'number' | 'date'>;

// Bundled Predict the Output puzzles. Rule: running the lines prints exactly `choices[answer]`,
// and no other choice is a reasonable reading of what Python actually does.
export const FALLBACK_OUTPUT_PUZZLES: Base[] = [
  {
    format: 'output',
    title: 'Two names, one list',
    prompt: 'What does this print?',
    lines: [
      { text: 'xs = [1, 2, 3]', indent: 0 },
      { text: 'ys = xs', indent: 0 },
      { text: 'ys.append(4)', indent: 0 },
      { text: 'print(len(xs))', indent: 0 },
    ],
    choices: ['3', '4', 'Error', 'None'],
    answer: 1,
    why: '`ys = xs` doesn’t copy anything; both names point at the same list. Appending through `ys` changes the list `xs` sees. Use `xs.copy()` or `xs[:]` for an independent list.',
  },
  {
    format: 'output',
    title: 'Floor division',
    prompt: 'What does this print?',
    lines: [{ text: 'print(7 // 2, -7 // 2)', indent: 0 }],
    choices: ['3 -3', '3.5 -3.5', '4 -4', '3 -4'],
    answer: 3,
    why: '`//` rounds toward negative infinity, not toward zero. `7 / 2` is 3.5, floored to 3; `-7 / 2` is -3.5, floored to -4. C and Java truncate to -3 instead, which trips people moving between languages.',
  },
  {
    format: 'output',
    title: 'Sticky default',
    prompt: 'What does this print?',
    lines: [
      { text: 'def f(x, acc=[]):', indent: 0 },
      { text: 'acc.append(x)', indent: 1 },
      { text: 'return acc', indent: 1 },
      { text: 'f(1)', indent: 0 },
      { text: 'print(f(2))', indent: 0 },
    ],
    choices: ['[2]', '[1]', '[1, 2]', '[2, 1]'],
    answer: 2,
    why: 'The default list is created once, when `def` runs. Every call that omits `acc` shares it, so the second call appends to the list the first call already filled.',
  },
  {
    format: 'output',
    title: 'Slicing',
    prompt: 'What does this print?',
    lines: [
      { text: 's = "while"', indent: 0 },
      { text: 'print(s[1:-1])', indent: 0 },
    ],
    choices: ['hil', 'hile', 'whil', 'il'],
    answer: 0,
    why: 'Slices include the start and exclude the end. `1` starts at `h`, and `-1` is the last character `e`, which is left out, so you get `hil`.',
  },
  {
    format: 'output',
    title: 'Late binding',
    prompt: 'What does this print?',
    lines: [
      { text: 'fs = [lambda: i for i in range(3)]', indent: 0 },
      { text: 'print([f() for f in fs])', indent: 0 },
    ],
    choices: ['[0, 1, 2]', '[3, 3, 3]', '[2, 2, 2]', '[0, 0, 0]'],
    answer: 2,
    why: 'Each lambda looks up `i` when it is called, not when it is made. By then the loop has finished and `i` is 2. Bind it early with `lambda i=i: i` to get `[0, 1, 2]`.',
  },
  {
    format: 'output',
    title: 'Equal but not the same',
    prompt: 'What does this print?',
    lines: [
      { text: 'a = [1]', indent: 0 },
      { text: 'b = [1]', indent: 0 },
      { text: 'print(a == b, a is b)', indent: 0 },
    ],
    choices: ['True True', 'False False', 'False True', 'True False'],
    answer: 3,
    why: '`==` compares contents, and both lists hold `[1]`. `is` asks whether they are the same object, and two separate list literals are two separate objects.',
  },
  {
    format: 'output',
    title: 'Chained comparison',
    prompt: 'What does this print?',
    lines: [{ text: 'print(1 < 3 > 2)', indent: 0 }],
    choices: ['True', 'False', 'Error', '2'],
    answer: 0,
    why: 'Python chains comparisons: `1 < 3 > 2` means `1 < 3 and 3 > 2`, which is `True`. It is not `(1 < 3) > 2`, which would be `True > 2`, or `False`.',
  },
];
