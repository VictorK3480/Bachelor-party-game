import { useReducer, useRef, useState } from 'react';
import { GameManager } from './game/manager';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import ResultsScreen from './components/ResultsScreen';

export default function App() {
  const managerRef = useRef<GameManager | null>(null);
  const [, bump] = useReducer((c: number) => c + 1, 0);
  const [setupError, setSetupError] = useState<string | null>(null);

  function startGame(teamNames: string[]) {
    try {
      const manager = new GameManager(teamNames);
      manager.startGame();
      managerRef.current = manager;
      setSetupError(null);
      bump();
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : String(e));
    }
  }

  function newGame() {
    managerRef.current = null;
    setSetupError(null);
    bump();
  }

  const manager = managerRef.current;
  if (!manager) {
    return <SetupScreen onStart={startGame} error={setupError} />;
  }

  const state = manager.getState();
  if (state.gamePhase === 'GAME_END') {
    return <ResultsScreen manager={manager} onNewGame={newGame} />;
  }

  return <GameScreen manager={manager} onChange={bump} />;
}
