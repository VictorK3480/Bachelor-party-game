import type { Team } from '../types';
import LeaderboardList from './LeaderboardList';

interface Props {
  teams: Team[];
  onClose: () => void;
}

// GAME_DESIGN.md §16: "leaderboard display" is one of the GM's controls,
// distinct from the always-on scoreboard bar - a popup the GM can bring up
// between turns for a clear, ranked view.
export default function LeaderboardOverlay({ teams, onClose }: Props) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="leaderboard-overlay" onClick={(e) => e.stopPropagation()}>
        <h2 className="leaderboard-title">🏆 Standings</h2>
        <LeaderboardList teams={teams} />
        <button className="primary-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
