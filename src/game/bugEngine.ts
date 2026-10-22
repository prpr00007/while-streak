import type { BugPuzzle } from '../types';

export const MAX_TRIES = 3;

export type GameStatus = 'playing' | 'won' | 'lost';
export type BugGame = {
  puzzleNumber: number;
  guesses: number[]; // line indexes, in the order they were tried
  status: GameStatus;
  startedAt: number;
  endedAt: number | null;
  submitted: boolean;
};

export function newGame(p: BugPuzzle): BugGame {
  return { puzzleNumber: p.number, guesses: [], status: 'playing', startedAt: Date.now(), endedAt: null, submitted: false };
}

export const canGuess = (g: BugGame, i: number) => g.status === 'playing' && !g.guesses.includes(i);

export function guess(g: BugGame, p: BugPuzzle, i: number): BugGame {
  if (!canGuess(g, i)) return g;
  const guesses = [...g.guesses, i];
  if (i === p.bug) return { ...g, guesses, status: 'won', endedAt: Date.now() };
  if (guesses.length >= MAX_TRIES) return { ...g, guesses, status: 'lost', endedAt: Date.now() };
  return { ...g, guesses };
}

export const misses = (g: BugGame, p: BugPuzzle) => g.guesses.filter((i) => i !== p.bug);

// One row, one cell per guess: true for the hit.
export function gridRows(g: BugGame, p: BugPuzzle): boolean[][] {
  return g.guesses.length ? [g.guesses.map((i) => i === p.bug)] : [];
}

export function scoreLabel(g: BugGame): string {
  return g.status === 'won' ? `${g.guesses.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
}

export function shareText(g: BugGame, p: BugPuzzle, streak: number): string {
  const row = g.guesses.map((i) => (i === p.bug ? '■' : '□')).join('');
  return [`while(streak) #${p.number} bug hunt`, row, `${scoreLabel(g)}  streak ${streak}`].join('\n');
}
