import { GameManager } from '../src/game/manager';
import { buildMap, validateMap } from '../src/game/map';
import { DEFAULT_CONFIG } from '../src/game/config';
import type { GameState, Question } from '../src/types';
import questionsData from '../data/questions.json';

const DOUBLE_POINTS_IDS = new Set(
  (questionsData as Question[]).filter((q) => q.doublePoints).map((q) => q.id)
);

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passCount++;
    console.log(`PASS - ${name}`);
  } else {
    failCount++;
    const msg = detail ? `${name} (${detail})` : name;
    failures.push(msg);
    console.log(`FAIL - ${msg}`);
  }
}

function section(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

// Drives a full game deterministically. `pickCorrect(team, encounterNum)`
// decides correct/incorrect for each encounter; `pickNodeIndex` picks which
// available node index to choose (default: always the first). Once every
// team has finished its normal encounters, the manager enters the shared
// FINAL_ROUND phase (GAME_DESIGN.md §14) - this drives that to completion
// too, picking `pickWinnerIndex` as the closest team.
function playFullGame(
  teamNames: string[],
  pickCorrect: (teamIndex: number, encounterNum: number) => boolean,
  pickNodeIndex: (available: string[], teamIndex: number, encounterNum: number) => number = () => 0,
  pickWinnerIndex: (teamCount: number) => number = () => 0
): GameManager {
  const manager = new GameManager(teamNames);
  manager.startGame();

  let guard = 0;
  while (!manager.isGameOver()) {
    guard++;
    if (guard > teamNames.length * 9 + 5) {
      throw new Error('playFullGame exceeded expected turn count - possible infinite loop.');
    }
    const state = manager.getState();

    if (state.gamePhase === 'FINAL_ROUND') {
      manager.revealFinalAnswer();
      const winnerTeam = manager.getState().teams[pickWinnerIndex(manager.getState().teams.length)];
      manager.resolveFinalRound(winnerTeam.id);
      manager.finishGame();
      continue;
    }

    const teamIndex = state.currentTeamIndex;
    const encounterNum = state.teams[teamIndex].encountersCompleted + 1;

    const available = manager.getAvailableNodes();
    const idx = pickNodeIndex(available, teamIndex, encounterNum);
    manager.selectNode(available[idx]);
    manager.revealAnswer();
    manager.resolveAnswer(pickCorrect(teamIndex, encounterNum));
    manager.advanceAfterResult();
  }
  return manager;
}

function randomBool(rate = 0.6): boolean {
  return Math.random() < rate;
}
function randomIndex(n: number): number {
  return Math.floor(Math.random() * n);
}

// ---------------------------------------------------------------------------
section('MAP TOPOLOGY INVARIANTS');
// ---------------------------------------------------------------------------
{
  const map = buildMap(DEFAULT_CONFIG);
  validateMap(map); // must not throw
  check('validateMap() does not throw on the real map', true);

  const startNode = map['start'];
  check('start has exactly 3 connections', startNode.connections.length === 3);
  const layer1Ids = Object.values(map)
    .filter((n) => n.layer === 1)
    .map((n) => n.id)
    .sort();
  check(
    'start connects to exactly the 3 layer-1 nodes',
    JSON.stringify([...startNode.connections].sort()) === JSON.stringify(layer1Ids)
  );

  const layer9Nodes = Object.values(map).filter((n) => n.layer === 9);
  check('there are layer-9 nodes', layer9Nodes.length > 0);
  const allTerminal = layer9Nodes.every((n) => n.connections.length === 0);
  check(
    'every layer-9 node is terminal (no outgoing connections) - the final boss is a shared round, not a map node',
    allTerminal,
    `layer9 -> ${JSON.stringify(layer9Nodes.map((n) => n.connections))}`
  );
  check("map has no 'boss' node", map['boss'] === undefined);

  let allEdgesGoForward = true;
  let edgeCounts1to3 = true;
  for (const node of Object.values(map)) {
    if (node.layer === 9) continue; // terminal, expected 0 connections (checked above)
    if (node.connections.length < 1 || node.connections.length > 3) edgeCounts1to3 = false;
    for (const targetId of node.connections) {
      const target = map[targetId];
      if (!target || target.layer !== node.layer + 1) allEdgesGoForward = false;
    }
  }
  check('every non-terminal node has 1-3 forward connections', edgeCounts1to3);
  check('every connection points to a node exactly one layer ahead', allEdgesGoForward);

  // Convergence rule: a node shares at most one forward connection with an
  // adjacent (same-layer, neighboring index) node.
  let convergenceOk = true;
  for (let layer = 1; layer <= 8; layer++) {
    const nodes = Object.values(map)
      .filter((n) => n.layer === layer)
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i < nodes.length; i++) {
      const neighbors = [nodes[i - 1], nodes[i + 1]].filter(Boolean) as typeof nodes;
      for (const neighbor of neighbors) {
        const shared = nodes[i].connections.filter((c) => neighbor.connections.includes(c));
        if (shared.length > 1) convergenceOk = false;
      }
    }
  }
  check('convergence rule holds: no node shares more than 1 forward edge with a neighbor', convergenceOk);
}

// ---------------------------------------------------------------------------
section('3-TEAM AND 4-TEAM FULL GAMES (random paths + random correctness)');
// ---------------------------------------------------------------------------
for (const teamCount of [3, 4]) {
  const teamNames = Array.from({ length: teamCount }, (_, i) => `Team-${i}`);
  const manager = playFullGame(
    teamNames,
    () => randomBool(),
    (available) => randomIndex(available.length)
  );
  const state = manager.getState();

  check(`[${teamCount}-team] game reaches GAME_END`, state.gamePhase === 'GAME_END');
  check(
    `[${teamCount}-team] every team completed exactly 9 encounters`,
    state.teams.every((t) => t.encountersCompleted === 9)
  );
  check(
    `[${teamCount}-team] turnHistory has teamCount*9 + 1 records (one shared final-round record)`,
    state.turnHistory.length === teamCount * 9 + 1
  );
  check(
    `[${teamCount}-team] every team ends at a layer-9 node`,
    state.teams.every((t) => state.map[t.position]?.layer === 9)
  );
  const finalBossRecords = state.turnHistory.filter((r) => r.encounterType === 'FINAL_BOSS');
  check(
    `[${teamCount}-team] exactly one shared FINAL_BOSS record exists, worth +bossValue for the winner only`,
    finalBossRecords.length === 1 &&
      finalBossRecords[0].scoreChange === DEFAULT_CONFIG.bossValue &&
      finalBossRecords[0].isCorrect === true
  );
  check(
    `[${teamCount}-team] all questions used are unique`,
    new Set(state.turnHistory.map((r) => r.questionId)).size === state.turnHistory.length
  );
  check(
    `[${teamCount}-team] no back-to-back repeated category per team`,
    state.teams.every((team) => {
      const cats = state.turnHistory.filter((r) => r.teamId === team.id).map((r) => r.category);
      return cats.every((c, i) => i === 0 || c !== cats[i - 1]);
    })
  );
}

// ---------------------------------------------------------------------------
section('DIFFERENT MAP PATHS (many randomized playthroughs, stress test)');
// ---------------------------------------------------------------------------
{
  const RUNS = 40;
  let allOk = true;
  let distinctPathSignatures = new Set<string>();
  for (let i = 0; i < RUNS; i++) {
    const manager = playFullGame(
      ['A', 'B', 'C', 'D'],
      () => randomBool(),
      (available) => randomIndex(available.length)
    );
    const state = manager.getState();
    if (state.gamePhase !== 'GAME_END') allOk = false;
    if (!state.teams.every((t) => t.encountersCompleted === 9 && state.map[t.position]?.layer === 9)) allOk = false;
    if (state.turnHistory.filter((r) => r.encounterType === 'FINAL_BOSS').length !== 1) allOk = false;
    for (const team of state.teams) {
      const path = state.turnHistory
        .filter((r) => r.teamId === team.id && r.encounterType !== 'FINAL_BOSS')
        .map((r) => r.nodeId)
        .join('>');
      distinctPathSignatures.add(path);
    }
  }
  check(`${RUNS} randomized 4-team games all complete correctly`, allOk);
  check(
    'randomized runs actually produce different map paths (risk/reward choice matters)',
    distinctPathSignatures.size > 1,
    `${distinctPathSignatures.size} distinct paths observed`
  );
}

// ---------------------------------------------------------------------------
section('SCORING: SYMMETRY, POSITIVE, NEGATIVE, WINNER CALCULATION');
// ---------------------------------------------------------------------------
{
  // All-correct team -> strictly positive final score, one per encounter.
  const allCorrect = playFullGame(['P', 'Q', 'R'], () => true);
  const stateAC = allCorrect.getState();
  const teamP = stateAC.teams.find((t) => t.name === 'P')!;
  const recordsP = stateAC.turnHistory.filter((r) => r.teamId === teamP.id);
  const expectedPositive = recordsP.reduce((sum, r) => sum + r.scoreChange, 0);
  check('all-correct run: every scoreChange is positive', recordsP.every((r) => r.scoreChange > 0));
  check('all-correct run: final score is positive and matches sum of changes', teamP.score === expectedPositive && teamP.score > 0);

  // All-incorrect team -> strictly negative final score. The shared final
  // round is steered to a different team (index 1, not X) so X's records
  // stay purely negative for the check below.
  const allIncorrect = playFullGame(['X', 'Y', 'Z'], () => false, undefined, () => 1);
  const stateAI = allIncorrect.getState();
  const teamX = stateAI.teams.find((t) => t.name === 'X')!;
  const recordsX = stateAI.turnHistory.filter((r) => r.teamId === teamX.id);
  const expectedNegative = recordsX.reduce((sum, r) => sum + r.scoreChange, 0);
  check('all-incorrect run: every scoreChange is negative', recordsX.every((r) => r.scoreChange < 0));
  check('all-incorrect run: final score is negative and matches sum of changes', teamX.score === expectedNegative && teamX.score < 0);
  check('negative scores are actually reachable and supported', teamX.score < 0);

  // Symmetry across a big batch of random games, cross-checked against the
  // map's own node values (not just internal self-consistency).
  let symmetryOk = true;
  let forfeitAlwaysOnIncorrect = true;
  let neverForfeitOnCorrect = true;
  let alwaysProgresses = true;
  for (let i = 0; i < 15; i++) {
    const m = playFullGame(['S1', 'S2', 'S3', 'S4'], () => randomBool(), (a) => randomIndex(a.length));
    const st = m.getState();
    const map = st.map;
    for (const r of st.turnHistory) {
      // The shared final-round record isn't tied to a map node and isn't
      // symmetric (winner-only +bossValue, GAME_DESIGN.md §14) - checked
      // separately below instead.
      if (r.encounterType === 'FINAL_BOSS') continue;
      const node = map[r.nodeId];
      const multiplier = DOUBLE_POINTS_IDS.has(r.questionId) ? 2 : 1;
      const expected = (r.isCorrect ? node.value : -node.value) * multiplier;
      if (r.scoreChange !== expected) symmetryOk = false;
      if (!r.isCorrect && !r.forfeitId) forfeitAlwaysOnIncorrect = false;
      if (r.isCorrect && r.forfeitId) neverForfeitOnCorrect = false;
    }
    const finalRecord = st.turnHistory.find((r) => r.encounterType === 'FINAL_BOSS');
    if (!finalRecord || finalRecord.scoreChange !== DEFAULT_CONFIG.bossValue) symmetryOk = false;
    for (const team of st.teams) {
      if (team.encountersCompleted !== 9) alwaysProgresses = false;
    }
  }
  check('symmetric scoring holds across many games (correct=+value, incorrect=-value, matches map node value; final round is winner-only +bossValue)', symmetryOk);
  check('every incorrect answer produced a forfeit', forfeitAlwaysOnIncorrect);
  check('no correct answer ever produced a forfeit', neverForfeitOnCorrect);
  check('every team always reached exactly 9 encounters regardless of outcome mix (always progresses)', alwaysProgresses);

  // Winner calculation / leaderboard sort.
  const lb = allCorrect.getLeaderboard();
  const sortedOk = lb.every((t, i) => i === 0 || lb[i - 1].score >= t.score);
  check('getLeaderboard() is sorted descending by score', sortedOk);
  check('leaderboard winner has the max score among all teams', lb[0].score === Math.max(...stateAC.teams.map((t) => t.score)));
}

// ---------------------------------------------------------------------------
section('TIES');
// ---------------------------------------------------------------------------
{
  // Drive two teams through identical node choices and identical
  // correctness patterns -> guaranteed identical final scores.
  // All 3 teams follow the exact same node choices and the exact same
  // correctness pattern (a function of encounter number only) -> a
  // guaranteed 3-way tie, so the leaderboard's top score must include all of them.
  const manager = new GameManager(['Tie-A', 'Tie-B', 'Tie-C']);
  manager.startGame();
  let turn = 0;
  while (!manager.isGameOver()) {
    turn++;
    const state = manager.getState();
    if (state.gamePhase === 'FINAL_ROUND') {
      // Not part of the tie itself (winner-only, per-team-untouched) - just
      // drive it to completion so the game can reach GAME_END.
      manager.revealFinalAnswer();
      manager.resolveFinalRound(state.teams[0].id);
      manager.finishGame();
      continue;
    }
    const teamIndex = state.currentTeamIndex;
    const available = manager.getAvailableNodes();
    manager.selectNode(available[0]); // always the first option, for every team
    manager.revealAnswer();
    const encounterNum = state.teams[teamIndex].encountersCompleted + 1;
    manager.resolveAnswer(encounterNum % 2 === 0);
    manager.advanceAfterResult();
    if (turn > 40) throw new Error('tie scenario exceeded expected turns');
  }
  const state = manager.getState();
  const [a, b, c] = ['Tie-A', 'Tie-B', 'Tie-C'].map((n) => state.teams.find((t) => t.name === n)!);
  // Normal-encounter score only (excludes the shared final-round record,
  // which was deliberately steered to team A above and so is expected to
  // break the raw tie by design - GAME_DESIGN.md §14 winner-only scoring).
  const rawScore = (teamId: string) =>
    state.turnHistory
      .filter((r) => r.teamId === teamId && r.encounterType !== 'FINAL_BOSS')
      .reduce((sum, r) => sum + r.scoreChange, 0);
  // Identical node choices no longer guarantee identical *specific*
  // questions (usedQuestionIds is global, so once one team draws a given
  // question no other team can) - and a doublePoints question doubles that
  // one record's contribution regardless of which team drew it. Dividing
  // each record back out by its own multiplier isolates the thing this
  // check actually cares about (same tier value + same correctness ->
  // same contribution), independent of which team happened to draw the
  // one doublePoints question at that tier.
  const normalizedScore = (teamId: string) =>
    state.turnHistory
      .filter((r) => r.teamId === teamId && r.encounterType !== 'FINAL_BOSS')
      .reduce((sum, r) => sum + r.scoreChange / (DOUBLE_POINTS_IDS.has(r.questionId) ? 2 : 1), 0);
  check(
    'three teams with identical paths + identical correctness produce identical normalized encounter scores',
    normalizedScore(a.id) === normalizedScore(b.id) && normalizedScore(b.id) === normalizedScore(c.id),
    `A=${normalizedScore(a.id)} B=${normalizedScore(b.id)} C=${normalizedScore(c.id)}`
  );
  check(
    "the final round's winner-only bonus is exactly the difference between A's final score and A's own normal-encounter score",
    a.score === rawScore(a.id) + DEFAULT_CONFIG.bossValue && b.score === rawScore(b.id) && c.score === rawScore(c.id)
  );
}

// ---------------------------------------------------------------------------
section('REPEATED CLICKS / DOUBLE SUBMISSION PROTECTION');
// ---------------------------------------------------------------------------
{
  const manager = new GameManager(['R1', 'R2', 'R3']);
  manager.startGame();
  const available = manager.getAvailableNodes();

  manager.selectNode(available[0]);
  let threwOnDoubleSelect = false;
  try {
    manager.selectNode(available[1] ?? available[0]);
  } catch {
    threwOnDoubleSelect = true;
  }
  check('a second selectNode() while already in QUESTION phase throws', threwOnDoubleSelect);

  let threwOnResolveBeforeReveal = false;
  try {
    manager.resolveAnswer(true);
  } catch {
    threwOnResolveBeforeReveal = true;
  }
  check('resolveAnswer() before revealAnswer() throws', threwOnResolveBeforeReveal);

  manager.revealAnswer();
  let threwOnDoubleReveal = false;
  try {
    manager.revealAnswer();
  } catch {
    threwOnDoubleReveal = true;
  }
  check('a second revealAnswer() throws (answer already revealed)', threwOnDoubleReveal);

  const scoreBefore = manager.getState().teams[0].score;
  manager.resolveAnswer(true);
  const scoreAfterFirst = manager.getState().teams[0].score;
  let threwOnDoubleResolve = false;
  try {
    manager.resolveAnswer(false);
  } catch {
    threwOnDoubleResolve = true;
  }
  const scoreAfterSecondAttempt = manager.getState().teams[0].score;
  check('a second resolveAnswer() throws (double-click protection)', threwOnDoubleResolve);
  check(
    'a rejected double resolveAnswer() produces exactly one score change, not two',
    scoreAfterFirst !== scoreBefore && scoreAfterSecondAttempt === scoreAfterFirst
  );

  manager.advanceAfterResult();
  let threwOnDoubleAdvance = false;
  try {
    manager.advanceAfterResult();
  } catch {
    threwOnDoubleAdvance = true;
  }
  check('a second advanceAfterResult() throws (no active encounter / wrong phase)', threwOnDoubleAdvance);

  let threwOnInvalidNode = false;
  try {
    manager.selectNode('this-node-does-not-exist');
  } catch {
    threwOnInvalidNode = true;
  }
  check('selecting a node outside the available set throws (invalid node selection blocked)', threwOnInvalidNode);
}

// ---------------------------------------------------------------------------
section('UNDO (single-step, every action type)');
// ---------------------------------------------------------------------------
{
  const manager = new GameManager(['U1', 'U2', 'U3']);
  manager.startGame();

  // Undo a selectNode().
  const beforeSelect = JSON.stringify({ ...manager.getState(), usedQuestionIds: [...manager.getState().usedQuestionIds] });
  const available = manager.getAvailableNodes();
  manager.selectNode(available[0]);
  const usedAfterSelect = [...manager.getState().usedQuestionIds];
  manager.undo();
  const afterUndoSelect = manager.getState();
  check('undo after selectNode() restores NODE_SELECT phase with no current encounter', afterUndoSelect.gamePhase === 'NODE_SELECT' && afterUndoSelect.currentEncounter === null);
  check('undo after selectNode() frees the used question id again', usedAfterSelect.length === 1 && !afterUndoSelect.usedQuestionIds.has(usedAfterSelect[0]));
  let threwOnDoubleUndo = false;
  try {
    manager.undo();
  } catch {
    threwOnDoubleUndo = true;
  }
  check('calling undo() twice in a row throws the second time (no multi-step undo)', threwOnDoubleUndo);
  void beforeSelect;

  // Redo the same action normally after an undo (manager not left broken).
  manager.selectNode(available[0]);
  check('manager still works normally after an undo (re-select succeeds)', manager.getState().gamePhase === 'QUESTION');

  // Undo a revealAnswer().
  manager.revealAnswer();
  manager.undo();
  check('undo after revealAnswer() restores isAnswerRevealed=false', manager.getState().isAnswerRevealed === false);

  // Undo a resolveAnswer().
  manager.revealAnswer();
  const scoreBeforeResolve = manager.getState().teams[0].score;
  manager.resolveAnswer(false);
  const scoreAfterResolve = manager.getState().teams[0].score;
  const historyLenAfterResolve = manager.getState().turnHistory.length;
  manager.undo();
  const afterUndoResolve = manager.getState();
  check('undo after resolveAnswer() reverts the score change', afterUndoResolve.teams[0].score === scoreBeforeResolve && scoreAfterResolve !== scoreBeforeResolve);
  check('undo after resolveAnswer() reverts turnHistory and phase back to QUESTION/revealed', afterUndoResolve.turnHistory.length === historyLenAfterResolve - 1 && afterUndoResolve.gamePhase === 'QUESTION' && afterUndoResolve.isAnswerRevealed === true);

  // Undo an advanceAfterResult().
  manager.resolveAnswer(false);
  const positionBeforeAdvance = manager.getState().teams[0].position;
  const encountersBeforeAdvance = manager.getState().teams[0].encountersCompleted;
  manager.advanceAfterResult();
  const positionAfterAdvance = manager.getState().teams[0].position;
  manager.undo();
  const afterUndoAdvance = manager.getState();
  check('undo after advanceAfterResult() reverts team position', afterUndoAdvance.teams[0].position === positionBeforeAdvance && positionAfterAdvance !== positionBeforeAdvance);
  check('undo after advanceAfterResult() reverts encountersCompleted', afterUndoAdvance.teams[0].encountersCompleted === encountersBeforeAdvance);
  check('undo after advanceAfterResult() restores RESULT phase and currentTeamIndex', afterUndoAdvance.gamePhase === 'RESULT' && afterUndoAdvance.currentTeamIndex === 0);
}

// ---------------------------------------------------------------------------
section('QUESTION EXHAUSTION / FALLBACK NEVER CRASHES');
// ---------------------------------------------------------------------------
{
  // With the real content pool, run enough full games back-to-back (each a
  // fresh GameManager, matching "pool is scoped to one game") to exercise
  // the difficulty-widening and category-drop fallback heavily.
  let ok = true;
  let totalDraws = 0;
  for (let i = 0; i < 25; i++) {
    const m = playFullGame(['E1', 'E2', 'E3', 'E4'], () => randomBool(), (a) => randomIndex(a.length));
    const st = m.getState();
    totalDraws += st.turnHistory.length;
    if (st.gamePhase !== 'GAME_END') ok = false;
  }
  check(`25 back-to-back 4-team games (${totalDraws} question draws total) never threw / never stalled`, ok);
}

// ---------------------------------------------------------------------------
section('SUMMARY');
// ---------------------------------------------------------------------------
console.log(`\n${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(failCount > 0 ? 1 : 0);
