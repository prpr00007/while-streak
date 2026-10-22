import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, MAX_TRIES } from '../game/orderEngine';
import { addDays, localDateKey } from './date';

export type StreakInfo = { count: number; best: number; last: string | null };
export type Stats = { played: number; wins: number; dist: number[] };

const STREAK = 'ws:streak';
const STATS = 'ws:stats';
const gameKey = (n: number) => `ws:game:${n}`;
const defaultStreak: StreakInfo = { count: 0, best: 0, last: null };
const defaultStats = (): Stats => ({ played: 0, wins: 0, dist: Array(MAX_TRIES).fill(0) });

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

export const loadGame = (n: number) => read<GameState | null>(gameKey(n), null);
export const saveGame = (g: GameState) => write(gameKey(g.puzzleNumber), g);
export const loadStats = () => read<Stats>(STATS, defaultStats());

export async function loadStreak(): Promise<StreakInfo> {
  const s = await read<StreakInfo>(STREAK, defaultStreak);
  const today = localDateKey();
  if (s.last !== today && s.last !== addDays(today, -1)) return { ...s, count: 0 };
  return s;
}

export async function recordFinish(won: boolean, tries: number) {
  const today = localDateKey();
  const s = await read<StreakInfo>(STREAK, defaultStreak);
  let streak: StreakInfo;
  if (won) {
    if (s.last === today) streak = s;
    else {
      const count = (s.last === addDays(today, -1) ? s.count : 0) + 1;
      streak = { count, best: Math.max(s.best, count), last: today };
    }
  } else {
    streak = { count: 0, best: s.best, last: null };
  }
  const st = await loadStats();
  const stats: Stats = {
    played: st.played + 1,
    wins: st.wins + (won ? 1 : 0),
    dist: st.dist.map((n, i) => (won && i === tries - 1 ? n + 1 : n)),
  };
  await write(STREAK, streak);
  await write(STATS, stats);
  return { streak, stats };
}
