// Core game types and interfaces

export type EncounterType = 'TREASURE' | 'BATTLE' | 'PUZZLE' | 'MYSTERY' | 'ELITE' | 'FINAL_BOSS';

export type QuestionType = 'text' | 'multiple-choice' | 'image' | 'audio' | 'video' | 'youtube';

export type GamePhase =
  | 'SETUP'
  | 'NODE_SELECT'
  | 'QUESTION'
  | 'RESULT'
  | 'FINAL_ROUND'
  | 'FINAL_ROUND_RESULT'
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
  media?: string; // audio/video source, used when type is 'audio' or 'video'
  youtubeId?: string; // YouTube video id, used when type is 'youtube' (requires internet at play time - CONTENT_GUIDE.md §2)
  // Optional playback window (seconds) for 'audio'/'video' questions - before
  // the answer is revealed, playback/seeking is confined to [clipStart,
  // clipEnd]; once revealed, the full file is playable normally
  // (CONTENT_GUIDE.md §2). Both optional and independent - e.g. clipEnd
  // alone just caps how far the pre-reveal excerpt runs.
  clipStart?: number;
  clipEnd?: number;
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

export interface FinalRoundResult {
  winningTeamId: string;
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
  // How many times each forfeit id has been selected so far this game -
  // used to weight future selection away from repeats without excluding
  // them outright (forfeits.ts's selectForfeit()). Keyed by forfeit id.
  forfeitUseCounts: Record<string, number>;
  // The final boss is a single shared round posed to every team at once,
  // after all teams finish their normal map encounters - not a per-team map
  // node (GAME_DESIGN.md §14). These fields mirror currentEncounter /
  // isAnswerRevealed / lastResolution but for that shared round.
  finalRoundQuestion: Question | null;
  isFinalAnswerRevealed: boolean;
  finalRoundResult: FinalRoundResult | null;
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
