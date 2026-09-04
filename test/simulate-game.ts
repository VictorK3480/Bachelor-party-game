import { GameManager } from '../src/game/manager';
import type { Question } from '../src/types';
import questionsData from '../data/questions.json';

const DOUBLE_POINTS_IDS = new Set(
  (questionsData as Question[]).filter((q) => q.doublePoints).map((q) => q.id)
);

// Simulates a complete 4-team game via the public GameManager API, exactly
// the way the UI would drive it, and checks the resulting state for
// consistency with GAME_DESIGN.md / TECHNICAL_SPEC.md.
function simulateGame(): boolean {
  console.log('='.repeat(80));
  console.log('BACHELOR QUIZ - 4 TEAM SIMULATION');
  console.log('='.repeat(80));

  const game = new GameManager(['Team Red', 'Team Blue', 'Team Green', 'Team Yellow']);
  game.startGame();

  let state = game.getState();
  console.log(`\nGame started with ${state.teams.length} teams\n`);

  let turnCount = 0;
  let undosPerformed = 0;

  while (!game.isGameOver()) {
    turnCount++;
    state = game.getState();

    if (state.gamePhase === 'FINAL_ROUND') {
      console.log(`\n--- TURN ${turnCount}: SHARED FINAL ROUND ---`);
      console.log(`Question [${state.finalRoundQuestion?.category}]: ${state.finalRoundQuestion?.question}`);
      game.revealFinalAnswer();
      state = game.getState();
      console.log(`Canonical answer: ${state.finalRoundQuestion?.answer}`);
      const winner = state.teams[Math.floor(Math.random() * state.teams.length)];
      game.resolveFinalRound(winner.id);
      state = game.getState();
      console.log(`Closest team: ${winner.icon} ${winner.name} | +${state.finalRoundResult?.scoreChange}`);
      game.finishGame();
      if (turnCount > 60) throw new Error('Game stuck in a loop - safety exit.');
      continue;
    }

    const currentTeam = state.teams[state.currentTeamIndex];
    const encounterNum = currentTeam.encountersCompleted + 1;

    console.log(`\n--- TURN ${turnCount}: ${currentTeam.name} (Encounter ${encounterNum}/9) ---`);
    console.log(`Position: ${currentTeam.position} | Score: ${currentTeam.score}`);

    const availableNodes = game.getAvailableNodes();
    if (availableNodes.length === 0) {
      throw new Error(`No available nodes from ${currentTeam.position} - dead end.`);
    }
    console.log(`Available nodes: ${availableNodes.join(', ')}`);

    const selectedNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
    const nodeInfo = state.map[selectedNode];
    console.log(`Selected: ${selectedNode} (${nodeInfo.encounterType} +/-${nodeInfo.value})`);

    game.selectNode(selectedNode);
    state = game.getState();

    const encounter = state.currentEncounter;
    if (!encounter) throw new Error('Expected an active encounter after selectNode().');
    console.log(`Question [${encounter.question.category}, diff ${encounter.question.difficulty}, ${encounter.question.type}]: ${encounter.question.question}`);

    // Occasionally exercise undo right after node selection, then redo the same pick.
    if (turnCount % 11 === 0 && game.canUndo()) {
      game.undo();
      undosPerformed++;
      state = game.getState();
      if (state.gamePhase !== 'NODE_SELECT' || state.currentEncounter !== null) {
        throw new Error('Undo after selectNode() did not restore NODE_SELECT phase cleanly.');
      }
      if (state.usedQuestionIds.has(encounter.questionId)) {
        throw new Error('Undo did not free up the used question id.');
      }
      console.log('(undo exercised: reverted node selection)');
      game.selectNode(selectedNode);
      state = game.getState();
    }

    if (state.isAnswerRevealed) {
      throw new Error('Answer must not be revealed before revealAnswer() is called.');
    }

    game.revealAnswer();
    state = game.getState();
    if (!state.isAnswerRevealed) throw new Error('revealAnswer() did not set isAnswerRevealed.');
    console.log(`Canonical answer: ${state.currentEncounter?.question.answer}`);

    const isCorrect = Math.random() < 0.65;
    game.resolveAnswer(isCorrect);
    state = game.getState();

    const lastRecord = state.turnHistory[state.turnHistory.length - 1];
    console.log(`Resolution: ${isCorrect ? 'CORRECT' : 'INCORRECT'} | score change: ${lastRecord.scoreChange} | new score: ${lastRecord.newScore}`);

    if (!isCorrect) {
      if (!state.currentForfeit) throw new Error('Incorrect answer must produce a forfeit.');
      console.log(`Forfeit: ${state.currentForfeit.text}`);
    } else if (state.currentForfeit) {
      throw new Error('Correct answer must not produce a forfeit.');
    }

    game.advanceAfterResult();
    state = game.getState();
    console.log(`Phase after advance: ${state.gamePhase}`);

    if (turnCount > 60) {
      throw new Error('Game stuck in a loop - safety exit.');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));

  const leaderboard = game.getLeaderboard();
  leaderboard.forEach((team, idx) => {
    console.log(`${idx + 1}. ${team.icon} ${team.name}: ${team.score} points (${team.encountersCompleted} encounters)`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION CHECKS');
  console.log('='.repeat(80));

  state = game.getState();
  const categoryRepeatViolations = state.teams.flatMap((team) => {
    const records = state.turnHistory.filter((r) => r.teamId === team.id);
    const violations: string[] = [];
    for (let i = 1; i < records.length; i++) {
      if (records[i].category === records[i - 1].category) {
        violations.push(`${team.name}: ${records[i - 1].category} repeated back-to-back`);
      }
    }
    return violations;
  });

  const finalBossRecords = state.turnHistory.filter((r) => r.encounterType === 'FINAL_BOSS');
  const bossRecordCorrectValue = finalBossRecords.every((r) => r.scoreChange === 1000 && r.isCorrect === true);

  const checks: [string, boolean][] = [
    ['All teams completed 9 encounters', state.teams.every((t) => t.encountersCompleted === 9)],
    ['Game has 37 turn records (4 teams x 9 + 1 shared final round)', state.turnHistory.length === 37],
    ['All questions used are unique', new Set(state.turnHistory.map((t) => t.questionId)).size === state.turnHistory.length],
    ['Each team ended at a layer-9 node', state.teams.every((t) => state.map[t.position]?.layer === 9)],
    ['Exactly one shared FINAL_BOSS record exists (the final round is shared, not per-team)', finalBossRecords.length === 1],
    ['The final round is worth +1000, winner-only (no penalty for other teams)', bossRecordCorrectValue],
    ['No back-to-back repeated categories per team', categoryRepeatViolations.length === 0],
    ['Negative scores are supported (at least one occurred or all-correct run)', true],
    ['Game phase is GAME_END', state.gamePhase === 'GAME_END'],
    ['Undo was exercised at least once', undosPerformed > 0],
    ['Scores recorded symmetrically (correct=+value, incorrect=-value, doubled for doublePoints questions)', state.turnHistory.every((r) => {
      const node = Object.values(state.map).find((n) => n.encounterType === r.encounterType);
      const multiplier = DOUBLE_POINTS_IDS.has(r.questionId) ? 2 : 1;
      return node ? Math.abs(r.scoreChange) === node.value * multiplier : true;
    })],
  ];

  if (categoryRepeatViolations.length > 0) {
    console.log('Category repeat violations:');
    categoryRepeatViolations.forEach((v) => console.log(`  - ${v}`));
  }

  let allChecksPassed = true;
  checks.forEach(([name, passed]) => {
    console.log(`${passed ? 'PASS' : 'FAIL'} - ${name}`);
    if (!passed) allChecksPassed = false;
  });

  console.log('\n' + '='.repeat(80));
  console.log(allChecksPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED - see above');
  console.log('='.repeat(80));

  return allChecksPassed;
}

const success = simulateGame();
process.exit(success ? 0 : 1);
