import type { OrderPuzzle, PuzzleLine } from '../types';

export const MAX_TRIES = 4;

export type Slot = { id: string; locked: boolean } | null;
export type GameStatus = 'playing' | 'won' | 'lost';
export type GameState = {
  puzzleNumber: number;
  slots: Slot[];
  attempts: boolean[][];
  status: GameStatus;
  startedAt: number;
  endedAt: number | null;
  submitted: boolean;
};

export function newGame(p: OrderPuzzle): GameState {
  return {
    puzzleNumber: p.number,
    slots: Array(p.solution.length).fill(null),
    attempts: [],
    status: 'playing',
    startedAt: Date.now(),
    endedAt: null,
    submitted: false,
  };
}

export function lineById(p: OrderPuzzle, id: string): PuzzleLine {
  return p.lines.find((l) => l.id === id)!;
}

// Same shuffle for every player on the same puzzle.
export function poolOrder(p: OrderPuzzle): string[] {
  let h = 2166136261 >>> 0;
  for (const ch of `while(streak)#${p.number}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  if (h === 0) h = 1;
  const rand = () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
  const ids = p.lines.map((l) => l.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  if (p.solution.every((id, i) => ids[i] === id)) ids.push(ids.shift()!);
  return ids;
}

export function placedIds(g: GameState): Set<string> {
  return new Set(g.slots.filter((s): s is { id: string; locked: boolean } => !!s).map((s) => s.id));
}

export function place(g: GameState, id: string): GameState {
  const i = g.slots.findIndex((s) => s === null);
  if (i === -1 || placedIds(g).has(id)) return g;
  const slots = g.slots.slice();
  slots[i] = { id, locked: false };
  return { ...g, slots };
}

export function unplace(g: GameState, i: number): GameState {
  const s = g.slots[i];
  if (!s || s.locked) return g;
  const slots = g.slots.slice();
  slots[i] = null;
  return { ...g, slots };
}

export function clearUnlocked(g: GameState): GameState {
  return { ...g, slots: g.slots.map((s) => (s && s.locked ? s : null)) };
}

export const isFull = (g: GameState) => g.slots.every((s) => s !== null);
export const hasUnlocked = (g: GameState) => g.slots.some((s) => s && !s.locked);

export function evaluate(g: GameState, p: OrderPuzzle): boolean[] {
  return g.slots.map((s, i) => !!s && s.id === p.solution[i]);
}

export function applyResult(g: GameState, p: OrderPuzzle, row: boolean[]): GameState {
  const attempts = [...g.attempts, row];
  if (row.every(Boolean)) {
    return {
      ...g,
      attempts,
      slots: g.slots.map((s) => (s ? { id: s.id, locked: true } : s)),
      status: 'won',
      endedAt: Date.now(),
    };
  }
  if (attempts.length >= MAX_TRIES) {
    return {
      ...g,
      attempts,
      slots: p.solution.map((id) => ({ id, locked: true })),
      status: 'lost',
      endedAt: Date.now(),
    };
  }
  return {
    ...g,
    attempts,
    slots: g.slots.map((s, i) => (s && row[i] ? { id: s.id, locked: true } : null)),
  };
}

export function gridRows(g: GameState): string[] {
  return g.attempts.map((r) => r.map((ok) => (ok ? '■' : '□')).join(''));
}

export function scoreLabel(g: GameState): string {
  return g.status === 'won' ? `${g.attempts.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
}

export function shareText(g: GameState, p: OrderPuzzle, streak: number): string {
  return [`while(streak) #${p.number}`, ...gridRows(g), `${scoreLabel(g)}  streak ${streak}`].join('\n');
}
