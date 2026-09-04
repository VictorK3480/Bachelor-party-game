import { useState } from 'react';
import type { GameManager } from '../game/manager';
import { ENCOUNTER_ICON } from '../game/config';

interface Props {
  manager: GameManager;
  onChange: () => void;
}

// GAME_DESIGN.md §14: the final boss is a single shared round posed to every
// team at once, after all teams finish their normal map encounters. Only
// the team the GM judges closest is scored (+bossValue) - everyone else's
// score is untouched. Structurally mirrors QuestionOverlay.tsx, which now
// only ever handles normal per-team encounters.
export default function FinalRoundOverlay({ manager, onChange }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const state = manager.getState();
  const question = state.finalRoundQuestion;
  if (!question) return null;

  const isResult = state.gamePhase === 'FINAL_ROUND_RESULT';
  const bossValue = manager.getConfig().bossValue;

  function act(fn: () => void) {
    try {
      fn();
      setActionError(null);
      onChange();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  const winningTeam = state.finalRoundResult
    ? state.teams.find((t) => t.id === state.finalRoundResult!.winningTeamId)
    : null;

  return (
    <div className="overlay-backdrop boss-backdrop">
      <div className="question-overlay boss-overlay">
        <div className="overlay-header">
          <span className="overlay-header-main">
            <span className="overlay-icon">{ENCOUNTER_ICON.FINAL_BOSS}</span>
            <span className="overlay-header-text">
              DEN SIDSTE PRØVE
              <span className="overlay-header-value"> · +{bossValue}</span>
            </span>
          </span>
          <button
            className="overlay-undo-button"
            disabled={!manager.canUndo()}
            onClick={() => act(() => manager.undo())}
            title={manager.canUndo() ? 'Fortryd sidste handling' : 'Intet at fortryde — kun den seneste handling kan fortrydes'}
          >
            ↺ Fortryd
          </button>
        </div>

        <p className="overlay-category">Alle hold svarer sammen</p>
        <h2 className="overlay-question">{question.question}</h2>

        {actionError && <p className="overlay-error">{actionError}</p>}

        {!state.isFinalAnswerRevealed && !isResult && (
          <button className="primary-button reveal-button" onClick={() => act(() => manager.revealFinalAnswer())}>
            Vis svaret
          </button>
        )}

        {state.isFinalAnswerRevealed && !isResult && (
          <div className="answer-block answer-reveal-in">
            <p className="answer-reveal-label">Svaret er...</p>
            <p className="overlay-answer">{question.answer}</p>
            <p className="final-round-prompt">Hvilket hold var tættest på?</p>
            <div className="final-round-team-buttons">
              {state.teams.map((team) => (
                <button
                  key={team.id}
                  className="node-choice-button"
                  onClick={() => act(() => manager.resolveFinalRound(team.id))}
                >
                  <span className="node-choice-label">
                    {team.icon} {team.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isResult && winningTeam && state.finalRoundResult && (
          <div className="result-block correct">
            <div className="result-stamp">
              <span className="result-stamp-icon">🏆</span>
              <span className="result-stamp-text">
                {winningTeam.icon} {winningTeam.name} var tættest!
              </span>
            </div>
            <p className="result-score-change">+{state.finalRoundResult.scoreChange} point</p>

            <button className="primary-button" onClick={() => act(() => manager.finishGame())}>
              Vis resultater
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
