import type { Forfeit, Question, QuestionType } from '../types';
import questionsData from '../../data/questions.json';
import forfeitsData from '../../data/forfeits.json';

const VALID_TYPES: QuestionType[] = ['text', 'multiple-choice', 'image'];

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
    if (q.type === 'multiple-choice' && (!q.choices || q.choices.length < 2)) {
      errors.push(`Question ${label}: type is "multiple-choice" but fewer than 2 choices are set.`);
    }
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
  errors: string[];
}

export function loadContent(): LoadedContent {
  const questions = questionsData as Question[];
  const forfeits = forfeitsData as Forfeit[];
  const errors = [...validateQuestions(questions), ...validateForfeits(forfeits)];
  return { questions, forfeits, errors };
}
