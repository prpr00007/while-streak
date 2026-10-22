import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Format } from '../types';
import type { GameState } from '../game/orderEngine';
import type { BugGame } from '../game/bugEngine';
import type { ChoiceGame } from '../game/choiceEngine';
import { MAX_TRIES as ORDER_TRIES } from '../game/orderEngine';
import { MAX_TRIES as BUG_TRIES } from '../game/bugEngine';
import { MAX_TRIES as CHOICE_TRIES } from '../game/choiceEngine';
import { addDays, localDateKey, puzzleNumberFor } from './date';

export type StreakInfo = { count: number; best: number; last: string | null };
export type Stats = { played: number; wins: number; dist: number[] };
type Games = { order: GameState; bug: BugGame; output: ChoiceGame; fill: ChoiceGame };

export const FORMATS: Format[] = ['order', 'bug', 'output', 'fill'];
export const MAX_TRIES: Record<Format, number> = { order: ORDER_TRIES, bug: BUG_TRIES, ...CHOICE_TRIES };

// Order keeps its original keys so existing saves carry over.
const STREAK = 'ws:streak';
const statsKey = (f: Format) => (f === 'order' ? 'ws:stats' : `ws:stats:${f}`);
const gameKey = (f: Format, n: number) => (f === 'order' ? `ws:game:${n}` : `ws:${f}:${n}`);
const defaultStreak: StreakInfo = { count: 0, best: 0, last: null };
const defaultStats = (f: Format): Stats => ({ played: 0, wins: 0, dist: Array(MAX_TRIES[f]).fill(0) });

async function read<T>(k: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(k: string, v: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

export const loadGame = <F extends Format>(f: F, n: number) => read<Games[F] | null>(gameKey(f, n), null);
export const saveGame = <F extends Format>(f: F, g: Games[F]) => write(gameKey(f, g.puzzleNumber), g);
export const loadStats = (f: Format) => read<Stats>(statsKey(f), defaultStats(f));

export async function loadStreak(): Promise<StreakInfo> {
  const s = await read<StreakInfo>(STREAK, defaultStreak);
  const today = localDateKey();
  if (s.last !== today && s.last !== addDays(today, -1)) return { ...s, count: 0 };
  return s;
}

// The streak counts days with at least one solved puzzle. A loss only breaks it once
// every puzzle today has been lost; until then another format can still save the day.
export async function recordFinish(format: Format, won: boolean, tries: number) {
  const today = localDateKey();
  const s = await read<StreakInfo>(STREAK, defaultStreak);
  let streak = s;
  if (won) {
    if (s.last !== today) {
      const count = (s.last === addDays(today, -1) ? s.count : 0) + 1;
      streak = { count, best: Math.max(s.best, count), last: today };
    }
  } else if (s.last !== today) {
    const n = puzzleNumberFor(today);
    const others = await Promise.all(FORMATS.filter((f) => f !== format).map((f) => loadGame(f, n)));
    if (others.every((g) => g?.status === 'lost')) streak = { count: 0, best: s.best, last: null };
  }
  const st = await loadStats(format);
  const stats: Stats = {
    played: st.played + 1,
    wins: st.wins + (won ? 1 : 0),
    dist: st.dist.map((n, i) => (won && i === tries - 1 ? n + 1 : n)),
  };
  await write(STREAK, streak);
  await write(statsKey(format), stats);
  return { streak: await loadStreak(), stats };
}
