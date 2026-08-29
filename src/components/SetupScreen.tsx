import { useState } from 'react';

interface Props {
  onStart: (teamNames: string[]) => void;
  error: string | null;
}

const DEFAULT_NAMES = ['Team Red', 'Team Blue', 'Team Green', 'Team Yellow'];
// Matches what the game engine actually supports (TEAM_ICONS in config.ts
// has exactly 4 entries) - not a place to add more options without also
// wiring up icons/validation for them.
const TEAM_COUNT_OPTIONS = [3, 4];

export default function SetupScreen({ onStart, error }: Props) {
  const [teamCount, setTeamCount] = useState(4);
  const [names, setNames] = useState(DEFAULT_NAMES);
  const [localError, setLocalError] = useState<string | null>(null);

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function handleStart() {
    const activeNames = names.slice(0, teamCount).map((n) => n.trim());
    if (activeNames.some((n) => !n)) {
      setLocalError('Every team needs a name.');
      return;
    }
    if (new Set(activeNames).size !== activeNames.length) {
      setLocalError('Team names must be unique.');
      return;
    }
    setLocalError(null);
    onStart(activeNames);
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <span className="frame-ornament corner-tl" aria-hidden="true">
          ❖
        </span>
        <span className="frame-ornament corner-tr" aria-hidden="true">
          ❖
        </span>
        <span className="frame-ornament corner-bl" aria-hidden="true">
          ❖
        </span>
        <span className="frame-ornament corner-br" aria-hidden="true">
          ❖
        </span>

        <h1>Bachelor Party Quiz</h1>
        <p className="subtitle">Set up your teams to begin the adventure.</p>

        <div className="team-count-control">
          <span className="team-count-label">Number of teams</span>
          <div className="team-count-buttons">
            {TEAM_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={`team-count-button ${teamCount === count ? 'active' : ''}`}
                onClick={() => setTeamCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="team-name-inputs">
          {Array.from({ length: teamCount }, (_, i) => (
            <label key={i} className="team-name-field">
              Team {i + 1} name
              <input value={names[i]} onChange={(e) => updateName(i, e.target.value)} maxLength={24} />
            </label>
          ))}
        </div>

        {(localError || error) && <p className="error-text">{localError ?? error}</p>}

        <button className="setup-start-button" onClick={handleStart}>
          Start Game
        </button>
      </div>
    </div>
  );
}
