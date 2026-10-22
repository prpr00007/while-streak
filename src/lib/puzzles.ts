import type { BugPuzzle, Format, OrderPuzzle } from '../types';
import { FALLBACK_PUZZLES } from '../data/fallbackPuzzles';
import { FALLBACK_BUG_PUZZLES } from '../data/fallbackBugPuzzles';
import { localDateKey, puzzleNumberFor } from './date';
import { supabase } from './supabase';

// Today's row for a format from Supabase, or null when offline or not published.
async function fetchRow(format: Format, number: number) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('puzzles')
      .select('*')
      .eq('number', number)
      .eq('format', format)
      .maybeSingle();
    return data && !error ? data : null;
  } catch {
    return null;
  }
}

export async function getTodaysPuzzle(): Promise<OrderPuzzle> {
  const date = localDateKey();
  const number = puzzleNumberFor(date);
  const data = await fetchRow('order', number);
  if (data) {
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
  const base = FALLBACK_PUZZLES[(number - 1) % FALLBACK_PUZZLES.length];
  return { ...base, number, date };
}

export async function getTodaysBugPuzzle(): Promise<BugPuzzle> {
  const date = localDateKey();
  const number = puzzleNumberFor(date);
  const data = await fetchRow('bug', number);
  if (data) {
    return {
      number: data.number,
      date: data.publish_date,
      format: 'bug',
      title: data.title,
      prompt: data.prompt,
      lines: data.lines,
      bug: data.solution.bug,
      fix: data.solution.fix,
      hint: data.hint ?? '',
      why: data.why,
    };
  }
  const base = FALLBACK_BUG_PUZZLES[(number - 1) % FALLBACK_BUG_PUZZLES.length];
  return { ...base, number, date };
}
