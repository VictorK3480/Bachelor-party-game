import type { Forfeit } from '../types';

// GAME_DESIGN.md §13: forfeits are randomly selected and are not tracked as
// used, so the same forfeit may come up more than once in a game.
export function selectForfeit(pool: Forfeit[]): Forfeit {
  if (pool.length === 0) {
    throw new Error('No forfeits available.');
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
