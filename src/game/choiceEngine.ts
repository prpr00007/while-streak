import type { ChoicePuzzle } from '../types';

// Predict the Output is one shot; Fill the Blank gets three.
export const MAX_TRIES = { output: 1, fill: 3 } as const;

export type GameStatus = 'playing' | 'won' | 'lost';
export type ChoiceGame = {
  puzzleNumber: number;
  guesses: number[]; // choice indexes, in the order they were tried
  status: GameStatus;
  startedAt: number;
  endedAt: number | null;
  submitted: boolean;
};

export const maxTries = (p: ChoicePuzzle) => MAX_TRIES[p.format];

export function newGame(p: ChoicePuzzle): ChoiceGame {
  return { puzzleNumber: p.number, guesses: [], status: 'playing', startedAt: Date.now(), endedAt: null, submitted: false };
}

export const canGuess = (g: ChoiceGame, i: number) => g.status === 'playing' && !g.guesses.includes(i);

export function guess(g: ChoiceGame, p: ChoicePuzzle, i: number): ChoiceGame {
  if (!canGuess(g, i)) return g;
  const guesses = [...g.guesses, i];
  if (i === p.answer) return { ...g, guesses, status: 'won', endedAt: Date.now() };
  if (guesses.length >= maxTries(p)) return { ...g, guesses, status: 'lost', endedAt: Date.now() };
  return { ...g, guesses };
}

// One row, one cell per guess: true for the hit.
export function gridRows(g: ChoiceGame, p: ChoicePuzzle): boolean[][] {
  return g.guesses.length ? [g.guesses.map((i) => i === p.answer)] : [];
}

export function scoreLabel(g: ChoiceGame, p: ChoicePuzzle): string {
  return g.status === 'won' ? `${g.guesses.length}/${maxTries(p)}` : `X/${maxTries(p)}`;
}

const NAMES = { output: 'output', fill: 'fill the blank' } as const;

export function shareText(g: ChoiceGame, p: ChoicePuzzle, streak: number): string {
  const row = g.guesses.map((i) => (i === p.answer ? '■' : '□')).join('');
  return [`while(streak) #${p.number} ${NAMES[p.format]}`, row, `${scoreLabel(g, p)}  streak ${streak}`].join('\n');
}
