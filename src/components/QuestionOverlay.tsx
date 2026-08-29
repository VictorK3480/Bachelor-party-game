import { useState } from 'react';
import type { GameManager } from '../game/manager';
import { ENCOUNTER_ICON, ENCOUNTER_LABEL } from '../game/config';

interface Props {
  manager: GameManager;
  onChange: () => void;
}

// GAME_DESIGN.md §15: question (and forfeit, when applicable) pop up over
// the map when the step begins and pop back out once it concludes.
// TECHNICAL_SPEC.md §13: the canonical answer is withheld until reveal.
// GAME_DESIGN.md §14: the final boss gets a more dramatic presentation.
export default function QuestionOverlay({ manager, onChange }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const state = manager.getState();
  const encounter = state.currentEncounter;
  if (!encounter) return null;

  const { question } = encounter;
  const isResult = state.gamePhase === 'RESULT';
  const isBoss = encounter.encounterType === 'FINAL_BOSS';

  // See GameScreen.tsx's act() for why this needs a try/catch: without it, a
  // thrown action (e.g. an exhausted question pool) silently freezes the
  // overlay with no feedback and no re-render.
  function act(fn: () => void) {
    try {
      fn();
      setActionError(null);
      onChange();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className={`overlay-backdrop ${isBoss ? 'boss-backdrop' : ''}`}>
      <div className={`question-overlay encounter-${encounter.encounterType} ${isBoss ? 'boss-overlay' : ''}`}>
        <div className="overlay-header">
          <span className="overlay-header-main">
            <span className="overlay-icon">{ENCOUNTER_ICON[encounter.encounterType]}</span>
            <span className="overlay-header-text">
              {isBoss ? 'THE FINAL BOSS' : ENCOUNTER_LABEL[encounter.encounterType]}
              <span className="overlay-header-value"> · ±{encounter.value}</span>
            </span>
          </span>
          {/* Undo needs to be reachable from in here too, not just the game
              header - that header sits behind this overlay's backdrop
              (z-index 10) and is unreachable while this is open, which was
              exactly the moment it was most needed (right after marking an
              answer, before advancing past it). Same manager.undo() either
              way, just a second entry point to it.
              Always rendered (disabled when nothing to undo) rather than
              disappearing - undo is last-action-only by design, and a
              button that just vanishes once that slot is used reads as
              broken rather than "nothing left to undo." */}
          <button
            className="overlay-undo-button"
            disabled={!manager.canUndo()}
            onClick={() => act(() => manager.undo())}
            title={manager.canUndo() ? 'Undo the last action' : 'Nothing to undo — only the most recent action can be undone'}
          >
            ↺ Undo
          </button>
        </div>

        <p className="overlay-category">
          {question.category} · difficulty {question.difficulty}/5
        </p>
        <h2 className="overlay-question">{question.question}</h2>

        {actionError && <p className="overlay-error">{actionError}</p>}

        {question.image && (
          <div className="overlay-image-frame">
            <img className="overlay-image" src={`/${question.image}`} alt="" />
          </div>
        )}

        {question.type === 'multiple-choice' && question.choices && (
          <ul className="overlay-choices">
            {question.choices.map((choice) => (
              <li key={choice}>{choice}</li>
            ))}
          </ul>
        )}

        {!state.isAnswerRevealed && !isResult && (
          <button className="primary-button reveal-button" onClick={() => act(() => manager.revealAnswer())}>
            Reveal Answer
          </button>
        )}

        {state.isAnswerRevealed && !isResult && (
          <div className="answer-block answer-reveal-in">
            <p className="answer-reveal-label">The answer is...</p>
            <p className="overlay-answer">{question.answer}</p>
            {question.explanation && <p className="overlay-explanation">{question.explanation}</p>}
            <div className="resolution-buttons">
              <button className="correct-button" onClick={() => act(() => manager.resolveAnswer(true))}>
                ✓ Correct
              </button>
              <button className="incorrect-button" onClick={() => act(() => manager.resolveAnswer(false))}>
                ✗ Incorrect
              </button>
            </div>
          </div>
        )}

        {isResult && state.lastResolution && (
          <div className={`result-block ${state.lastResolution.isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="result-stamp">
              <span className="result-stamp-icon">{state.lastResolution.isCorrect ? '✓' : '✗'}</span>
              <span className="result-stamp-text">
                {state.lastResolution.isCorrect ? 'Correct!' : 'Incorrect!'}
              </span>
            </div>
            <p className="result-score-change">
              {state.lastResolution.scoreChange > 0 ? '+' : ''}
              {state.lastResolution.scoreChange} points
            </p>

            {state.currentForfeit && (
              <div className="forfeit-block">
                <p className="forfeit-label">💀 Forfeit</p>
                <p className="forfeit-text">{state.currentForfeit.text}</p>
              </div>
            )}

            <button className="primary-button" onClick={() => act(() => manager.advanceAfterResult())}>
              {state.currentForfeit ? 'Forfeit Complete' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
