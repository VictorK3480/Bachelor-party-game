import type { Team } from '../types';

interface Props {
  teams: Team[]; // expected pre-sorted, highest score first
}

// Shared ranked-list presentation used by both the mid-game leaderboard
// popup and the final results screen.
export default function LeaderboardList({ teams }: Props) {
  const topScore = teams[0]?.score ?? 0;

  return (
    <ol className="leaderboard-list">
      {teams.map((team, i) => (
        <li key={team.id} className={team.score === topScore ? 'leaderboard-leader' : ''}>
          <span className="leaderboard-rank">{i + 1}</span>
          <span className="leaderboard-icon">{team.icon}</span>
          <span className="leaderboard-name">{team.name}</span>
          {team.score === topScore && <span className="leaderboard-crown">👑</span>}
          <span className={`leaderboard-score ${team.score < 0 ? 'negative' : ''}`}>{team.score}</span>
        </li>
      ))}
    </ol>
  );
}
