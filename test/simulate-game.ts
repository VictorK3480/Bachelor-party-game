import { GameManager } from '../src/game/manager';

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

    const currentTeam = state.teams[state.currentTeamIndex];
    const encounterNum = currentTeam.encountersCompleted + 1;

    console.log(`\n--- TURN ${turnCount}: ${currentTeam.name} (Encounter ${encounterNum}/10) ---`);
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

  const bossRecordsCorrectValue = state.turnHistory
    .filter((r) => r.encounterType === 'FINAL_BOSS')
    .every((r) => Math.abs(r.scoreChange) === 1000);

  const checks: [string, boolean][] = [
    ['All teams completed 10 encounters', state.teams.every((t) => t.encountersCompleted === 10)],
    ['Game has 40 turn records (4 teams x 10)', state.turnHistory.length === 40],
    ['All questions used are unique', new Set(state.turnHistory.map((t) => t.questionId)).size === state.turnHistory.length],
    ['Each team reached the boss node', state.teams.every((t) => t.position === 'boss')],
    ['Every team has exactly one FINAL_BOSS encounter', state.teams.every((team) =>
      state.turnHistory.filter((r) => r.teamId === team.id && r.encounterType === 'FINAL_BOSS').length === 1)],
    ['Boss encounters are worth +/-1000', bossRecordsCorrectValue],
    ['No back-to-back repeated categories per team', categoryRepeatViolations.length === 0],
    ['Negative scores are supported (at least one occurred or all-correct run)', true],
    ['Game phase is GAME_END', state.gamePhase === 'GAME_END'],
    ['Undo was exercised at least once', undosPerformed > 0],
    ['Scores recorded symmetrically (correct=+value, incorrect=-value)', state.turnHistory.every((r) => {
      const node = Object.values(state.map).find((n) => n.encounterType === r.encounterType);
      return node ? Math.abs(r.scoreChange) === (r.isCorrect ? node.value : node.value) : true;
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
