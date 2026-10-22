import type { BugPuzzle, FillPuzzle, Format, OrderPuzzle, OutputPuzzle } from '../types';
import { FALLBACK_PUZZLES } from '../data/fallbackPuzzles';
import { FALLBACK_BUG_PUZZLES } from '../data/fallbackBugPuzzles';
import { FALLBACK_OUTPUT_PUZZLES } from '../data/fallbackOutputPuzzles';
import { FALLBACK_FILL_PUZZLES } from '../data/fallbackFillPuzzles';
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

// Output and Fill rows store { "choices": [...], "answer": n } in `solution`.
async function getChoicePuzzle<P extends OutputPuzzle | FillPuzzle>(format: P['format'], fallback: Omit<P, 'number' | 'date'>[]): Promise<P> {
  const date = localDateKey();
  const number = puzzleNumberFor(date);
  const data = await fetchRow(format, number);
  if (data) {
    return {
      number: data.number,
      date: data.publish_date,
      format,
      title: data.title,
      prompt: data.prompt,
      lines: data.lines,
      choices: data.solution.choices,
      answer: data.solution.answer,
      hint: data.hint ?? '',
      why: data.why,
    } as P;
  }
  const base = fallback[(number - 1) % fallback.length];
  return { ...base, number, date } as P;
}

export const getTodaysOutputPuzzle = () => getChoicePuzzle<OutputPuzzle>('output', FALLBACK_OUTPUT_PUZZLES);
export const getTodaysFillPuzzle = () => getChoicePuzzle<FillPuzzle>('fill', FALLBACK_FILL_PUZZLES);
