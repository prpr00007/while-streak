import type { OrderPuzzle } from '../types';
import { FALLBACK_PUZZLES } from '../data/fallbackPuzzles';
import { localDateKey, puzzleNumberFor } from './date';
import { supabase } from './supabase';

export async function getTodaysPuzzle(): Promise<OrderPuzzle> {
  const date = localDateKey();
  const number = puzzleNumberFor(date);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .eq('number', number)
        .maybeSingle();
      if (data && !error) {
        return {
          number: data.number,
          date: data.publish_date,
          format: 'order',
          title: data.title,
          prompt: data.prompt,
          lines: data.lines,
          solution: data.solution,
          why: data.why,
        };
      }
    } catch {}
  }

  const base = FALLBACK_PUZZLES[(number - 1) % FALLBACK_PUZZLES.length];
  return { ...base, number, date };
}
