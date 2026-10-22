export type Format = 'order' | 'bug' | 'output' | 'fill';

export type PuzzleLine = { id: string; text: string; indent: number };

export type OrderPuzzle = {
  number: number;
  date: string;
  format: 'order';
  title: string;
  prompt: string; // `backticks` render as inline code
  lines: PuzzleLine[]; // includes one decoy line
  solution: string[]; // line ids in the correct order
  why: string;
};

export type BugLine = { text: string; indent: number };

export type BugPuzzle = {
  number: number;
  date: string;
  format: 'bug';
  title: string;
  prompt: string; // `backticks` render as inline code
  lines: BugLine[]; // shown in order; exactly one is wrong
  bug: number; // 0-based index of the wrong line
  fix: string; // the corrected text of that line (same indent)
  hint: string; // shown after the first miss
  why: string;
};

// Shared shape for the two multiple-choice formats.
type ChoiceBase = {
  number: number;
  date: string;
  title: string;
  prompt: string; // `backticks` render as inline code
  lines: BugLine[];
  choices: string[]; // shown in this order to everyone
  answer: number; // index into choices
  why: string;
};

// Read the snippet, pick what it prints. One shot.
export type OutputPuzzle = ChoiceBase & { format: 'output' };

// One line contains `___`; pick the token that belongs there.
export type FillPuzzle = ChoiceBase & { format: 'fill'; hint: string };

export type ChoicePuzzle = OutputPuzzle | FillPuzzle;
