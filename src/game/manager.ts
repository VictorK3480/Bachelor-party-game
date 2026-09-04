import type {
  Forfeit,
  GameConfig,
  GameState,
  Question,
  Team,
  TurnRecord,
} from '../types';
import { DEFAULT_CONFIG, TEAM_ICONS, encounterValue } from './config';
import { buildMap, validateMap } from './map';
import { loadContent } from './content';
import { selectQuestion } from './selection';
import { selectForfeit } from './forfeits';

function cloneState(state: GameState): GameState {
  return {
    ...state,
    teams: state.teams.map((t) => ({ ...t })),
    map: { ...state.map }, // node objects are never mutated after buildMap()
    usedQuestionIds: new Set(state.usedQuestionIds),
    currentEncounter: state.currentEncounter ? { ...state.currentEncounter } : null,
    currentForfeit: state.currentForfeit ? { ...state.currentForfeit } : null,
    lastResolution: state.lastResolution ? { ...state.lastResolution } : null,
    turnHistory: state.turnHistory.map((r) => ({ ...r })),
    finalRoundResult: state.finalRoundResult ? { ...state.finalRoundResult } : null,
    forfeitUseCounts: { ...state.forfeitUseCounts },
  };
}

/**
 * Owns the full game state machine described in GAME_DESIGN.md §4 (Turn
 * Flow) and TECHNICAL_SPEC.md §7 (Answer Flow). One GameManager instance is
 * one game, scoped to a single playthrough.
 */
export class GameManager {
  private state: GameState;
  private config: GameConfig;
  private questionPool: Question[];
  private forfeitPool: Forfeit[];
  private finalBossQuestion: Question;
  // Forfeits pinned to a specific question via Question.forfeitId are
  // reserved for that question alone - excluded from the general random
  // pool so they don't also turn up for unrelated wrong answers, diluting
  // the whole point of coupling them.
  private randomForfeitPool: Forfeit[];
  private previousSnapshot: GameState | null = null;

  constructor(teamNames: string[], config: GameConfig = DEFAULT_CONFIG) {
    if (teamNames.length < 3 || teamNames.length > 4) {
      throw new Error('The game supports 3-4 teams (GAME_DESIGN.md §2).');
    }
    this.config = config;

    const { questions, forfeits, finalBossQuestion, errors } = loadContent();
    if (errors.length > 0) {
      throw new Error(`Content validation failed:\n${errors.join('\n')}`);
    }
    this.questionPool = questions;
    this.forfeitPool = forfeits;
    this.finalBossQuestion = finalBossQuestion;
    const coupledForfeitIds = new Set(questions.map((q) => q.forfeitId).filter((id): id is string => Boolean(id)));
    this.randomForfeitPool = forfeits.filter((f) => !coupledForfeitIds.has(f.id));

    const map = buildMap(config);
    validateMap(map);

    const teams: Team[] = teamNames.map((name, i) => ({
      id: `team-${i}`,
      name,
      icon: TEAM_ICONS[i % TEAM_ICONS.length],
      score: 0,
      position: 'start',
      encountersCompleted: 0,
    }));

    this.state = {
      teams,
      currentTeamIndex: 0,
      map,
      usedQuestionIds: new Set(),
      currentEncounter: null,
      gamePhase: 'SETUP',
      isAnswerRevealed: false,
      currentForfeit: null,
      lastResolution: null,
      turnHistory: [],
      finalRoundQuestion: null,
      isFinalAnswerRevealed: false,
      finalRoundResult: null,
      forfeitUseCounts: {},
    };
  }

  getState(): GameState {
    return this.state;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  private get currentTeam(): Team {
    return this.state.teams[this.state.currentTeamIndex];
  }

  private snapshot(): void {
    this.previousSnapshot = cloneState(this.state);
  }

  startGame(): void {
    if (this.state.gamePhase !== 'SETUP') {
      throw new Error(`Cannot start a game already in phase ${this.state.gamePhase}.`);
    }
    this.state.gamePhase = 'NODE_SELECT';
  }

  getAvailableNodes(): string[] {
    const node = this.state.map[this.currentTeam.position];
    return [...node.connections]; // copy - callers must never be able to mutate map topology
  }

  private lastCategoryFor(teamId: string): string | null {
    for (let i = this.state.turnHistory.length - 1; i >= 0; i--) {
      if (this.state.turnHistory[i].teamId === teamId) {
        return this.state.turnHistory[i].category;
      }
    }
    return null;
  }

  // Most questions draw randomly from the whole pool (CONTENT_GUIDE.md
  // §11), but a question can pin itself to one specific forfeit via
  // `forfeitId` (content.ts validates that id exists at load time, so the
  // lookup here is trusted to succeed).
  private selectForfeitFor(question: Question): Forfeit {
    if (question.forfeitId) {
      return this.forfeitPool.find((f) => f.id === question.forfeitId)!;
    }
    return selectForfeit(this.randomForfeitPool, this.state.forfeitUseCounts);
  }

  selectNode(nodeId: string): void {
    if (this.state.gamePhase !== 'NODE_SELECT') {
      throw new Error(`Cannot select a node during phase ${this.state.gamePhase}.`);
    }
    if (!this.getAvailableNodes().includes(nodeId)) {
      throw new Error(`Node ${nodeId} is not reachable from the current position.`);
    }
    const node = this.state.map[nodeId];
    if (!node.encounterType) {
      throw new Error(`Node ${nodeId} has no encounter type.`);
    }

    const team = this.currentTeam;
    const previousCategory = this.lastCategoryFor(team.id);
    const question = selectQuestion(
      this.questionPool,
      this.state.usedQuestionIds,
      node.encounterType,
      previousCategory
    );

    this.snapshot();

    this.state.usedQuestionIds.add(question.id);
    this.state.currentEncounter = {
      nodeId,
      encounterType: node.encounterType,
      value: node.value,
      questionId: question.id,
      question,
    };
    this.state.isAnswerRevealed = false;
    this.state.gamePhase = 'QUESTION';
  }

  revealAnswer(): void {
    if (this.state.gamePhase !== 'QUESTION') {
      throw new Error(`Cannot reveal an answer during phase ${this.state.gamePhase}.`);
    }
    if (this.state.isAnswerRevealed) {
      throw new Error('The answer has already been revealed.');
    }
    this.snapshot();
    this.state.isAnswerRevealed = true;
  }

  resolveAnswer(isCorrect: boolean): void {
    if (this.state.gamePhase !== 'QUESTION' || !this.state.isAnswerRevealed) {
      throw new Error('Cannot resolve an answer before it has been revealed.');
    }
    const encounter = this.state.currentEncounter;
    if (!encounter) {
      throw new Error('No active encounter to resolve.');
    }

    // Resolve anything that can still throw (forfeit selection) before any
    // state is mutated, so a failure here never leaves a half-applied score
    // change with no matching turn record - mirrors the same safe ordering
    // used in selectNode() for question selection.
    const forfeit = isCorrect ? null : this.selectForfeitFor(encounter.question);

    this.snapshot();

    const team = this.currentTeam;
    const pointMultiplier = encounter.question.doublePoints ? 2 : 1;
    const scoreChange = (isCorrect ? encounter.value : -encounter.value) * pointMultiplier;
    team.score += scoreChange;

    const record: TurnRecord = {
      teamId: team.id,
      teamName: team.name,
      nodeId: encounter.nodeId,
      encounterType: encounter.encounterType,
      questionId: encounter.questionId,
      category: encounter.question.category,
      isCorrect,
      scoreChange,
      newScore: team.score,
    };

    this.state.currentForfeit = forfeit;
    if (forfeit) {
      record.forfeitId = forfeit.id;
      this.state.forfeitUseCounts[forfeit.id] = (this.state.forfeitUseCounts[forfeit.id] ?? 0) + 1;
    }

    this.state.turnHistory.push(record);
    this.state.lastResolution = { isCorrect, scoreChange };
    this.state.gamePhase = 'RESULT';
  }

  /**
   * Advances the turn after the GM acknowledges the result (the "Continue"
   * control for a correct answer, or "Forfeit Complete" for an incorrect
   * one - GAME_DESIGN.md §16). A team always advances regardless of outcome.
   */
  advanceAfterResult(): void {
    if (this.state.gamePhase !== 'RESULT') {
      throw new Error(`Cannot advance during phase ${this.state.gamePhase}.`);
    }
    const encounter = this.state.currentEncounter;
    if (!encounter) {
      throw new Error('No active encounter to advance from.');
    }

    this.snapshot();

    const team = this.currentTeam;
    team.position = encounter.nodeId;
    team.encountersCompleted += 1;

    this.state.currentEncounter = null;
    this.state.isAnswerRevealed = false;
    this.state.currentForfeit = null;
    this.state.lastResolution = null;

    const allDone = this.state.teams.every(
      (t) => t.encountersCompleted >= this.config.encountersPerTeam
    );

    if (allDone) {
      // GAME_DESIGN.md §14: the final boss is a single shared round, posed
      // to every team at once, once everyone has finished their normal map
      // encounters - not a per-team map node.
      this.state.finalRoundQuestion = this.finalBossQuestion;
      this.state.isFinalAnswerRevealed = false;
      this.state.gamePhase = 'FINAL_ROUND';
      return;
    }

    this.state.currentTeamIndex = (this.state.currentTeamIndex + 1) % this.state.teams.length;
    this.state.gamePhase = 'NODE_SELECT';
  }

  revealFinalAnswer(): void {
    if (this.state.gamePhase !== 'FINAL_ROUND') {
      throw new Error(`Cannot reveal the final answer during phase ${this.state.gamePhase}.`);
    }
    if (this.state.isFinalAnswerRevealed) {
      throw new Error('The final answer has already been revealed.');
    }
    this.snapshot();
    this.state.isFinalAnswerRevealed = true;
  }

  /**
   * Resolves the shared final round: unlike a normal encounter, only the
   * closest team is scored - GAME_DESIGN.md §14. Everyone else's score is
   * left untouched (no symmetric penalty for not being closest).
   */
  resolveFinalRound(winningTeamId: string): void {
    if (this.state.gamePhase !== 'FINAL_ROUND' || !this.state.isFinalAnswerRevealed) {
      throw new Error('Cannot resolve the final round before the answer has been revealed.');
    }
    const question = this.state.finalRoundQuestion;
    if (!question) {
      throw new Error('No active final round question to resolve.');
    }
    const team = this.state.teams.find((t) => t.id === winningTeamId);
    if (!team) {
      throw new Error(`Unknown team: ${winningTeamId}`);
    }

    this.snapshot();

    const scoreChange = encounterValue(this.config, 'FINAL_BOSS');
    team.score += scoreChange;

    this.state.turnHistory.push({
      teamId: team.id,
      teamName: team.name,
      nodeId: 'final-round',
      encounterType: 'FINAL_BOSS',
      questionId: question.id,
      category: question.category,
      isCorrect: true,
      scoreChange,
      newScore: team.score,
    });

    this.state.finalRoundResult = { winningTeamId, scoreChange };
    this.state.gamePhase = 'FINAL_ROUND_RESULT';
  }

  /**
   * Advances from the final round's result to GAME_END, mirroring
   * advanceAfterResult()'s role for normal encounters.
   */
  finishGame(): void {
    if (this.state.gamePhase !== 'FINAL_ROUND_RESULT') {
      throw new Error(`Cannot finish the game during phase ${this.state.gamePhase}.`);
    }
    this.snapshot();
    this.state.finalRoundQuestion = null;
    this.state.isFinalAnswerRevealed = false;
    this.state.finalRoundResult = null;
    this.state.gamePhase = 'GAME_END';
  }

  canUndo(): boolean {
    return this.previousSnapshot !== null;
  }

  undo(): void {
    if (!this.previousSnapshot) {
      throw new Error('Nothing to undo.');
    }
    this.state = this.previousSnapshot;
    this.previousSnapshot = null;
  }

  isGameOver(): boolean {
    return this.state.gamePhase === 'GAME_END';
  }

  getLeaderboard(): Team[] {
    return [...this.state.teams].sort((a, b) => b.score - a.score);
  }
}
