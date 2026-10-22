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
