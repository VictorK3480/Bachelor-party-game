import type { Forfeit, Question, QuestionType } from '../types';
import questionsData from '../../data/questions.json';
import forfeitsData from '../../data/forfeits.json';
import finalBossData from '../../data/final-boss.json';

const VALID_TYPES: QuestionType[] = ['text', 'multiple-choice', 'image', 'audio', 'video', 'youtube'];

// TECHNICAL_SPEC.md §3 / CONTENT_GUIDE.md §12: validate content and report
// useful errors rather than failing silently.
function validateQuestions(questions: Question[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  if (questions.length === 0) {
    errors.push('The question pool is empty; at least one question is required.');
  }

  for (const q of questions) {
    const label = q.id || '(missing id)';
    if (!q.id) {
      errors.push('A question is missing an id.');
    } else if (seenIds.has(q.id)) {
      errors.push(`Duplicate question id: ${q.id}`);
    } else {
      seenIds.add(q.id);
    }

    if (!q.question || !q.question.trim()) errors.push(`Question ${label}: missing question text.`);
    if (!q.answer || !q.answer.trim()) errors.push(`Question ${label}: missing answer.`);
    if (!q.category || !q.category.trim()) errors.push(`Question ${label}: missing category.`);
    if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5) {
      errors.push(`Question ${label}: invalid difficulty (${q.difficulty}); must be an integer 1-5.`);
    }
    if (!VALID_TYPES.includes(q.type)) {
      errors.push(`Question ${label}: invalid type (${q.type}).`);
    }
    if (q.type === 'image' && !q.image) {
      errors.push(`Question ${label}: type is "image" but no image field is set.`);
    }
    if ((q.type === 'audio' || q.type === 'video') && !q.media) {
      errors.push(`Question ${label}: type is "${q.type}" but no media field is set.`);
    }
    if (q.type === 'youtube' && !q.youtubeId) {
      errors.push(`Question ${label}: type is "youtube" but no youtubeId field is set.`);
    }
    if (q.type === 'multiple-choice' && (!q.choices || q.choices.length < 2)) {
      errors.push(`Question ${label}: type is "multiple-choice" but fewer than 2 choices are set.`);
    }
    if ((q.clipStart !== undefined || q.clipEnd !== undefined) && q.type !== 'audio' && q.type !== 'video') {
      errors.push(`Question ${label}: clipStart/clipEnd only apply to "audio"/"video" questions, not "${q.type}".`);
    }
    if (q.clipStart !== undefined && q.clipEnd !== undefined && q.clipStart >= q.clipEnd) {
      errors.push(`Question ${label}: clipStart (${q.clipStart}) must be before clipEnd (${q.clipEnd}).`);
    }
  }

  return errors;
}

// The final boss is a single dedicated question (data/final-boss.json), not
// part of the general pool - it's posed once, shared by every team, in a
// dedicated end-of-game round rather than being difficulty-matched by
// selection.ts (see manager.ts's FINAL_ROUND phase / GAME_DESIGN.md §14).
function validateFinalBossQuestion(q: Question): string[] {
  const errors: string[] = [];
  if (!q.id) errors.push('The final boss question is missing an id.');
  if (!q.question || !q.question.trim()) errors.push('The final boss question is missing question text.');
  if (!q.answer || !q.answer.trim()) errors.push('The final boss question is missing an answer.');
  if (!q.category || !q.category.trim()) errors.push('The final boss question is missing a category.');
  if (!VALID_TYPES.includes(q.type)) {
    errors.push(`The final boss question has an invalid type (${q.type}).`);
  }
  return errors;
}

function validateForfeits(forfeits: Forfeit[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  if (forfeits.length === 0) {
    errors.push('The forfeit pool is empty; at least one forfeit is required (every incorrect answer needs one).');
  }

  for (const f of forfeits) {
    const label = f.id || '(missing id)';
    if (!f.id) {
      errors.push('A forfeit is missing an id.');
    } else if (seenIds.has(f.id)) {
      errors.push(`Duplicate forfeit id: ${f.id}`);
    } else {
      seenIds.add(f.id);
    }
    if (!f.text || !f.text.trim()) errors.push(`Forfeit ${label}: missing text.`);
  }

  return errors;
}

export interface LoadedContent {
  questions: Question[];
  forfeits: Forfeit[];
  finalBossQuestion: Question;
  errors: string[];
}

export function loadContent(): LoadedContent {
  const questions = questionsData as Question[];
  const forfeits = forfeitsData as Forfeit[];
  const finalBossQuestion = finalBossData as Question;
  const errors = [
    ...validateQuestions(questions),
    ...validateForfeits(forfeits),
    ...validateFinalBossQuestion(finalBossQuestion),
  ];
  return { questions, forfeits, finalBossQuestion, errors };
}
