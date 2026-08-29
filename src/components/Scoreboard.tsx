import type { GameState } from '../types';

interface Props {
  state: GameState;
}

// GAME_DESIGN.md §15: a persistent Jeopardy-style bar, every team's name and
// score evenly spread across the bottom of the screen. Team order stays
// fixed (like Jeopardy podiums) - only the crown and score value move.
export default function Scoreboard({ state }: Props) {
  const topScore = Math.max(...state.teams.map((t) => t.score));

  return (
    <div className="scoreboard">
      {state.teams.map((team, i) => (
        <div key={team.id} className={`scoreboard-team ${i === state.currentTeamIndex ? 'active' : ''}`}>
          {team.score === topScore && <span className="scoreboard-crown">👑</span>}
          <span className="scoreboard-icon">{team.icon}</span>
          <span className="scoreboard-name">{team.name}</span>
          {/* key forces a remount on every score change, restarting the pop animation */}
          <span key={team.score} className={`scoreboard-score ${team.score < 0 ? 'negative' : ''}`}>
            {team.score}
          </span>
        </div>
      ))}
    </div>
  );
}
