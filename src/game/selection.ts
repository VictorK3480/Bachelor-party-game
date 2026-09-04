import type { EncounterType, Question, QuestionType } from '../types';
import { ENCOUNTER_DIFFICULTY } from './config';

// Every non-text/multiple-choice question type - what a "spicy" question
// counts as for MYSTERY's preference below. Update this if a new media
// type is ever added (CONTENT_GUIDE.md §2).
const MEDIA_TYPES: QuestionType[] = ['image', 'audio', 'video', 'youtube'];

/**
 * TECHNICAL_SPEC.md §6 question selection algorithm:
 * 1. unused only
 * 2. drop the previous category for this team (unless that empties the pool)
 * 3. MYSTERY prefers media questions (image/audio/video/youtube) when available
 * 4. exact difficulty match, else nearest difficulty, else any remaining
 * 5. random pick among the resulting eligible pool
 */
export function selectQuestion(
  pool: Question[],
  usedIds: ReadonlySet<string>,
  encounterType: EncounterType,
  previousCategory: string | null
): Question {
  const unused = pool.filter((q) => !usedIds.has(q.id));
  if (unused.length === 0) {
    throw new Error('No unused questions remain in the pool.');
  }

  const withoutRepeatCategory = previousCategory
    ? unused.filter((q) => q.category !== previousCategory)
    : unused;
  const categoryPool = withoutRepeatCategory.length > 0 ? withoutRepeatCategory : unused;

  const targetDifficulty = ENCOUNTER_DIFFICULTY[encounterType];

  let byDifficulty = categoryPool.filter((q) => q.difficulty === targetDifficulty);
  for (let spread = 1; byDifficulty.length === 0 && spread <= 4; spread++) {
    byDifficulty = categoryPool.filter((q) => Math.abs(q.difficulty - targetDifficulty) === spread);
  }
  if (byDifficulty.length === 0) byDifficulty = categoryPool;

  let finalPool = byDifficulty;
  if (encounterType === 'MYSTERY') {
    // "Spicy" media questions are the modern form of MYSTERY's original
    // image-preference (CONTENT_GUIDE.md §2).
    const mediaPool = byDifficulty.filter((q) => MEDIA_TYPES.includes(q.type));
    if (mediaPool.length > 0) finalPool = mediaPool;
  }

  const index = Math.floor(Math.random() * finalPool.length);
  return finalPool[index];
}
