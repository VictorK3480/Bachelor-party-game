import { useState } from 'react';
import type { GameManager } from '../game/manager';
import { ENCOUNTER_ICON, ENCOUNTER_LABEL } from '../game/config';
import ClippedMedia from './ClippedMedia';

interface Props {
  manager: GameManager;
  onChange: () => void;
}

// GAME_DESIGN.md §15: question (and forfeit, when applicable) pop up over
// the map when the step begins and pop back out once it concludes.
// TECHNICAL_SPEC.md §13: the canonical answer is withheld until reveal.
// The final boss is a separate shared round (FinalRoundOverlay.tsx) - this
// overlay only ever handles normal per-team encounters.
export default function QuestionOverlay({ manager, onChange }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const state = manager.getState();
  const encounter = state.currentEncounter;
  if (!encounter) return null;

  const { question } = encounter;
  const isResult = state.gamePhase === 'RESULT';
  // Visual media (a photo/video/YouTube clip) is the whole point of these
  // questions - on a small shared screen a 640px box makes it too small to
  // actually see, so these get a much wider/taller overlay. Audio doesn't
  // need it (there's no large visual, just a player bar).
  const isVisualMedia = question.type === 'image' || question.type === 'video' || question.type === 'youtube';

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
    <div className="overlay-backdrop">
      <div className={`question-overlay encounter-${encounter.encounterType} ${isVisualMedia ? 'overlay-media-large' : ''}`}>
        <div className="overlay-header">
          <span className="overlay-header-main">
            <span className="overlay-icon">{ENCOUNTER_ICON[encounter.encounterType]}</span>
            <span className="overlay-header-text">
              {ENCOUNTER_LABEL[encounter.encounterType]}
              <span className="overlay-header-value">
                {' '}
                · ±{question.doublePoints ? encounter.value * 2 : encounter.value}
              </span>
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
            title={manager.canUndo() ? 'Fortryd sidste handling' : 'Intet at fortryde — kun den seneste handling kan fortrydes'}
          >
            ↺ Fortryd
          </button>
        </div>

        {question.doublePoints && <div className="double-points-badge">🌟 Dobbelt Point 🌟</div>}

        <h2 className="overlay-question">{question.question}</h2>

        {actionError && <p className="overlay-error">{actionError}</p>}

        {question.image && (
          <div className="overlay-image-frame">
            <img className="overlay-image" src={`/${question.image}`} alt="" />
          </div>
        )}

        {(question.type === 'audio' || question.type === 'video') && question.media && (
          <div className="overlay-media-frame">
            <ClippedMedia
              kind={question.type}
              className={question.type === 'audio' ? 'overlay-audio' : 'overlay-video'}
              src={`/${question.media}`}
              clipStart={question.clipStart}
              clipEnd={question.clipEnd}
              restricted={!state.isAnswerRevealed}
            />
            {!state.isAnswerRevealed && (question.clipStart !== undefined || question.clipEnd !== undefined) && (
              <p className="overlay-clip-hint">Kun uddraget afspilles nu — hele klippet frigives, når svaret vises.</p>
            )}
          </div>
        )}

        {question.type === 'youtube' && question.youtubeId && (
          <div className="overlay-media-frame">
            <div className="overlay-youtube-frame">
              {/* youtube-nocookie.com (not youtube.com) + rel=0/modestbranding=1/
                  iv_load_policy=3 minimize YouTube's own chrome (related-video
                  suggestions, branding, annotations). This never navigates to
                  youtube.com itself, so the browser tab/page title always stays
                  on our own page - the real leak risk. YouTube dropped the old
                  showinfo=0 title-hide param years ago, so there's no fully
                  guaranteed way to suppress its title text via URL params alone;
                  the gradient bar below is a belt-and-suspenders visual cover
                  for the title/channel row regardless of what YouTube renders. */}
              <iframe
                className="overlay-youtube-iframe"
                src={`https://www.youtube-nocookie.com/embed/${question.youtubeId}?rel=0&modestbranding=1&iv_load_policy=3`}
                title="Spørgsmålsvideo"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <div className="overlay-youtube-titleguard" aria-hidden="true" />
            </div>
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
            Vis svaret
          </button>
        )}

        {state.isAnswerRevealed && !isResult && (
          <div className="answer-block answer-reveal-in">
            <p className="answer-reveal-label">Svaret er...</p>
            <p className="overlay-answer">{question.answer}</p>
            {question.explanation && <p className="overlay-explanation">{question.explanation}</p>}
            <div className="resolution-buttons">
              <button className="correct-button" onClick={() => act(() => manager.resolveAnswer(true))}>
                ✓ Korrekt
              </button>
              <button className="incorrect-button" onClick={() => act(() => manager.resolveAnswer(false))}>
                ✗ Forkert
              </button>
            </div>
          </div>
        )}

        {isResult && state.lastResolution && (
          <div className={`result-block ${state.lastResolution.isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="result-stamp">
              <span className="result-stamp-icon">{state.lastResolution.isCorrect ? '✓' : '✗'}</span>
              <span className="result-stamp-text">
                {state.lastResolution.isCorrect ? 'Korrekt!' : 'Forkert!'}
              </span>
            </div>
            <p className="result-score-change">
              {state.lastResolution.scoreChange > 0 ? '+' : ''}
              {state.lastResolution.scoreChange} point
            </p>

            {state.currentForfeit && (
              <div className="forfeit-block">
                <p className="forfeit-label">💀 Straf</p>
                <p className="forfeit-text">{state.currentForfeit.text}</p>
              </div>
            )}

            <button className="primary-button" onClick={() => act(() => manager.advanceAfterResult())}>
              {state.currentForfeit ? 'Straffen er udført' : 'Fortsæt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
