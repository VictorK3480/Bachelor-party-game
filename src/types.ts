// Core game types and interfaces

export type EncounterType = 'TREASURE' | 'BATTLE' | 'PUZZLE' | 'MYSTERY' | 'ELITE' | 'FINAL_BOSS';

export type QuestionType = 'text' | 'multiple-choice' | 'image';

export type GamePhase =
  | 'SETUP'
  | 'NODE_SELECT'
  | 'QUESTION'
  | 'RESULT'
  | 'GAME_END';

export interface Team {
  id: string;
  name: string;
  icon: string;
  score: number;
  position: string; // node id
  encountersCompleted: number;
}

export interface MapNode {
  id: string;
  layer: number; // 0 = START, 1-9 = normal layers, 10 = BOSS
  encounterType: EncounterType | null; // null only for START
  value: number;
  connections: string[]; // node ids this connects forward to
  x: number; // normalized 0-1, for visualization
  y: number; // normalized 0-1, for visualization
}

export interface Question {
  id: string;
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: QuestionType;
  question: string;
  answer: string;
  choices?: string[];
  explanation?: string;
  image?: string;
  tags?: string[];
}

export interface Forfeit {
  id: string;
  text: string;
  intensity?: number;
  tags?: string[];
}

export interface Encounter {
  nodeId: string;
  encounterType: EncounterType;
  value: number;
  questionId: string;
  question: Question;
}

export interface ResolutionResult {
  isCorrect: boolean;
  scoreChange: number;
}

export interface GameState {
  teams: Team[];
  currentTeamIndex: number;
  map: Record<string, MapNode>;
  usedQuestionIds: Set<string>;
  currentEncounter: Encounter | null;
  gamePhase: GamePhase;
  isAnswerRevealed: boolean;
  currentForfeit: Forfeit | null;
  lastResolution: ResolutionResult | null;
  turnHistory: TurnRecord[];
}

export interface TurnRecord {
  teamId: string;
  teamName: string;
  nodeId: string;
  encounterType: EncounterType;
  questionId: string;
  category: string;
  isCorrect: boolean;
  scoreChange: number;
  newScore: number;
  forfeitId?: string;
}

export interface GameConfig {
  teamCount: number;
  encountersPerTeam: number;
  treasureValue: number;
  battleValue: number;
  puzzleValue: number;
  mysteryValue: number;
  eliteValue: number;
  bossValue: number;
}
