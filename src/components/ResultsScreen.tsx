import type { GameManager } from '../game/manager';
import LeaderboardList from './LeaderboardList';

interface Props {
  manager: GameManager;
  onNewGame: () => void;
}

export default function ResultsScreen({ manager, onNewGame }: Props) {
  const leaderboard = manager.getLeaderboard();
  const topScore = leaderboard[0].score;
  const winners = leaderboard.filter((t) => t.score === topScore);

  return (
    <div className="results-screen">
      <div className="results-glow" />
      <p className="results-eyebrow">The Quest Is Complete</p>
      <h1>🏆 Final Results</h1>
      <p className="winner-announcement">
        {winners.length > 1
          ? `It's a tie! ${winners.map((t) => t.name).join(' & ')} win with ${topScore} points!`
          : `${winners[0].icon} ${winners[0].name} wins with ${topScore} points!`}
      </p>

      <LeaderboardList teams={leaderboard} />

      <button className="primary-button" onClick={onNewGame}>
        New Game
      </button>
    </div>
  );
}
