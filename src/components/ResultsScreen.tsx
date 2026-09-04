import type { GameManager } from '../game/manager';
import LeaderboardList from './LeaderboardList';
import Confetti from './Confetti';

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
      <Confetti />
      <p className="results-eyebrow">Questen er fuldført</p>
      <h1>🏆 Slutresultat</h1>
      <p className="winner-announcement">
        {winners.length > 1
          ? `Det er uafgjort! ${winners.map((t) => t.name).join(' & ')} vinder med ${topScore} point!`
          : `${winners[0].icon} ${winners[0].name} vinder med ${topScore} point!`}
      </p>

      <LeaderboardList teams={leaderboard} />

      <button className="primary-button" onClick={onNewGame}>
        Nyt Spil
      </button>
    </div>
  );
}
