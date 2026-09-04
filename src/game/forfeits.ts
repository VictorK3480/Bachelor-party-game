import type { Forfeit } from '../types';

// GAME_DESIGN.md §13: forfeits are randomly selected. Unlike questions, a
// forfeit is never excluded once used - the same one can come up again -
// but each prior use halves-ish its odds relative to a fresh one
// (weight = 1 / (useCount + 1)), so repeats get progressively less likely
// without ever becoming impossible. There is no association between a
// forfeit and question difficulty/category - the pool is flat.
export function selectForfeit(pool: Forfeit[], useCounts: Record<string, number> = {}): Forfeit {
  if (pool.length === 0) {
    throw new Error('No forfeits available.');
  }

  const weights = pool.map((f) => 1 / ((useCounts[f.id] ?? 0) + 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1]; // floating-point rounding fallback
}
