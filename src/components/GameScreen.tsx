import { useState } from 'react';
import type { GameManager } from '../game/manager';
import MapView from './MapView';
import Scoreboard from './Scoreboard';
import QuestionOverlay from './QuestionOverlay';
import EncounterGlyph from './EncounterGlyph';
import { ENCOUNTER_LABEL } from '../game/config';

interface Props {
  manager: GameManager;
  onChange: () => void;
}

export default function GameScreen({ manager, onChange }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const state = manager.getState();
  const currentTeam = state.teams[state.currentTeamIndex];

  // TECHNICAL_SPEC.md §3/§15: fail gracefully and show a useful error rather
  // than letting a thrown action (e.g. content edited down to an unusable
  // pool) silently freeze the screen with no feedback.
  function act(fn: () => void) {
    try {
      fn();
      setActionError(null);
      onChange();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  const availableNodes = state.gamePhase === 'NODE_SELECT' ? manager.getAvailableNodes() : [];
  const isBossTurn = availableNodes.length === 1 && state.map[availableNodes[0]]?.id === 'boss';

  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>Bachelor Party Quiz</h1>
        <div className="header-controls">
          {/* Always rendered (disabled when there's nothing to undo) rather
              than disappearing - undo is last-action-only by design, and a
              button that just vanishes once that one slot is used reads as
              broken rather than "nothing left to undo." */}
          <button
            className="undo-button"
            disabled={!manager.canUndo()}
            onClick={() => act(() => manager.undo())}
            title={manager.canUndo() ? 'Undo the last action' : 'Nothing to undo — only the most recent action can be undone'}
          >
            ↺ Undo
          </button>
        </div>
      </header>

      {actionError && (
        <div className="action-error-banner">
          <span>{actionError}</span>
          <button className="ghost-button" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="map-area">
        <MapView state={state} availableNodeIds={availableNodes} />

        {state.gamePhase === 'NODE_SELECT' && (
          <div className={`node-select-panel ${isBossTurn ? 'boss-turn' : ''}`}>
            <p className="node-select-prompt">
              <span className="node-select-team">
                {currentTeam.icon} {currentTeam.name}
              </span>
              {isBossTurn ? ' faces the Final Boss!' : "'s turn — choose your path"}
              <span className="node-select-progress">Encounter {currentTeam.encountersCompleted + 1}/10</span>
            </p>
            <div className="node-choices">
              {availableNodes.map((nodeId) => {
                const node = state.map[nodeId];
                if (!node.encounterType) return null;
                return (
                  <button
                    key={nodeId}
                    className={`node-choice-button node-choice-${node.encounterType}`}
                    onClick={() => act(() => manager.selectNode(nodeId))}
                  >
                    {/* Same stamped-medallion language as the map nodes -
                        type color + light plate + dark ink glyph - instead
                        of a flat emoji on a generic dark card. */}
                    <svg viewBox="-12 -12 24 24" className="node-choice-icon" aria-hidden="true">
                      <circle r={11} className={`node-choice-icon-fill node-choice-icon-${node.encounterType}`} />
                      <circle r={7.6} className="node-icon-plate" />
                      <g transform="scale(0.66)">
                        <EncounterGlyph type={node.encounterType} />
                      </g>
                    </svg>
                    <span className="node-choice-label">{ENCOUNTER_LABEL[node.encounterType]}</span>
                    <span className="node-choice-value">±{node.value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(state.gamePhase === 'QUESTION' || state.gamePhase === 'RESULT') && (
        <QuestionOverlay manager={manager} onChange={onChange} />
      )}

      <Scoreboard state={state} />
    </div>
  );
}
