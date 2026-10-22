import type { OrderPuzzle } from '../types';
import { GameState, gridRows } from '../game/orderEngine';
import { supabase } from './supabase';

// Returns true once the result is stored (or was already stored).
export async function submitResult(game: GameState, p: OrderPuzzle): Promise<boolean> {
  if (!supabase || game.status === 'playing') return false;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return false;
  const { error } = await supabase.from('results').upsert(
    {
      user_id: user.id,
      puzzle_number: p.number,
      solved: game.status === 'won',
      tries: game.attempts.length,
      time_ms: (game.endedAt ?? Date.now()) - game.startedAt,
      grid: gridRows(game).join('\n'),
    },
    { onConflict: 'user_id,puzzle_number', ignoreDuplicates: true },
  );
  return !error;
}
