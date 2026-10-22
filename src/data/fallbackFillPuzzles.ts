import type { FillPuzzle } from '../types';

type Base = Omit<FillPuzzle, 'number' | 'date'>;

// Bundled Fill the Blank puzzles. Rule: exactly one line contains `___`, putting `choices[answer]`
// there makes the function correct, and every other choice breaks it.
export const FALLBACK_FILL_PUZZLES: Base[] = [
  {
    format: 'fill',
    title: 'Factorial',
    prompt: '`factorial(n)` should return `n!`, so `factorial(5)` is 120. Fill the blank.',
    lines: [
      { text: 'def factorial(n):', indent: 0 },
      { text: 'result = 1', indent: 1 },
      { text: 'for k in range(1, ___):', indent: 1 },
      { text: 'result *= k', indent: 2 },
      { text: 'return result', indent: 1 },
    ],
    choices: ['n', 'n + 1', 'n - 1', '0'],
    answer: 1,
    hint: '`range` stops before its end value. Which `k` does the loop need to reach?',
    why: '`range(1, n)` stops at `n - 1`, so it would leave `n` itself out of the product. The end has to be `n + 1` to include it.',
  },
  {
    format: 'fill',
    title: 'Count vowels',
    prompt: '`vowels(s)` should count the vowels in a lowercase string. Fill the blank.',
    lines: [
      { text: 'def vowels(s):', indent: 0 },
      { text: 'count = 0', indent: 1 },
      { text: 'for ch in s:', indent: 1 },
      { text: 'if ch ___ "aeiou":', indent: 2 },
      { text: 'count += 1', indent: 3 },
      { text: 'return count', indent: 1 },
    ],
    choices: ['not in', '==', 'in', 'is'],
    answer: 2,
    hint: '`ch` is one character and `"aeiou"` is five. You want a membership test.',
    why: '`in` on a string checks whether a character appears in it. `==` and `is` compare `ch` to the whole string `"aeiou"`, which never matches, and `not in` counts consonants.',
  },
  {
    format: 'fill',
    title: 'Reverse a string',
    prompt: '`reverse(s)` should return `s` backwards. Fill the blank.',
    lines: [
      { text: 'def reverse(s):', indent: 0 },
      { text: 'return s[___]', indent: 1 },
    ],
    choices: ['-1:', '::1', '1:', '::-1'],
    answer: 3,
    hint: 'A slice has three parts: start, stop, and step.',
    why: 'A step of `-1` walks the string from the end to the start. `-1:` is just the last character, `::1` is the whole string forwards, and `1:` drops the first character.',
  },
  {
    format: 'fill',
    title: 'Sum of evens',
    prompt: '`sum_evens(nums)` should add up only the even numbers. Fill the blank.',
    lines: [
      { text: 'def sum_evens(nums):', indent: 0 },
      { text: 'total = 0', indent: 1 },
      { text: 'for n in nums:', indent: 1 },
      { text: 'if n % 2 ___ 0:', indent: 2 },
      { text: 'total += n', indent: 3 },
      { text: 'return total', indent: 1 },
    ],
    choices: ['!=', '==', '>', '<'],
    answer: 1,
    hint: 'What is `n % 2` for an even number?',
    why: 'An even number leaves no remainder when divided by 2, so `n % 2 == 0`. `!=` and `>` pick the odd numbers instead, and `n % 2` is never below 0 here.',
  },
  {
    format: 'fill',
    title: 'Clamp',
    prompt: '`clamp(x, lo, hi)` should return `x` limited to the range `lo` to `hi`. Fill the blank.',
    lines: [
      { text: 'def clamp(x, lo, hi):', indent: 0 },
      { text: 'return max(lo, ___(x, hi))', indent: 1 },
    ],
    choices: ['max', 'abs', 'round', 'min'],
    answer: 3,
    hint: 'Work from the inside out. The inner call should cap `x` at `hi`.',
    why: '`min(x, hi)` caps `x` at the top of the range, then `max(lo, ...)` lifts it to the bottom. With `max` inside, everything comes out as at least `hi`.',
  },
  {
    format: 'fill',
    title: 'Swap',
    prompt: '`swap(a, b)` should return the two values the other way round. Fill the blank.',
    lines: [
      { text: 'def swap(a, b):', indent: 0 },
      { text: 'a, b = ___', indent: 1 },
      { text: 'return a, b', indent: 1 },
    ],
    choices: ['a, b', 'b, b', 'b, a', 'a + b'],
    answer: 2,
    hint: 'The right side is built in full before anything on the left is assigned.',
    why: 'Python evaluates the right side into a tuple first, then unpacks it, so `a, b = b, a` swaps without a temporary variable.',
  },
  {
    format: 'fill',
    title: 'Count words',
    prompt: '`word_count(s)` should count the words in a sentence like `"the quick fox"`. Fill the blank.',
    lines: [
      { text: 'def word_count(s):', indent: 0 },
      { text: 'return len(s.___())', indent: 1 },
    ],
    choices: ['strip', 'split', 'lower', 'count'],
    answer: 1,
    hint: 'You want a list with one item per word.',
    why: '`split()` with no argument breaks on runs of whitespace and returns a list of words. `strip` and `lower` return strings, so `len` would count characters.',
  },
];
