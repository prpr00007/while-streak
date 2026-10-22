import type { Format } from '../types';
import { supabase } from './supabase';

export type FinishedResult = {
  format: Format;
  puzzleNumber: number;
  won: boolean;
  tries: number;
  timeMs: number;
  grid: boolean[][];
};

// Returns true once the result is stored (or was already stored).
export async function submitResult(r: FinishedResult): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return false;
  const { error } = await supabase.from('results').upsert(
    {
      user_id: user.id,
      puzzle_number: r.puzzleNumber,
      format: r.format,
      solved: r.won,
      tries: r.tries,
      time_ms: r.timeMs,
      grid: r.grid.map((row) => row.map((ok) => (ok ? '■' : '□')).join('')).join('\n'),
    },
    { onConflict: 'user_id,puzzle_number,format', ignoreDuplicates: true },
  );
  return !error;
}
