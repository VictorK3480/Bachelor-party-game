import type { EncounterType, GameConfig } from '../types';

export const DEFAULT_CONFIG: GameConfig = {
  teamCount: 4,
  encountersPerTeam: 10,
  treasureValue: 200,
  battleValue: 400,
  puzzleValue: 600,
  mysteryValue: 400,
  eliteValue: 800,
  bossValue: 1000,
};

const ENCOUNTER_VALUE_KEY: Record<EncounterType, keyof GameConfig> = {
  TREASURE: 'treasureValue',
  BATTLE: 'battleValue',
  PUZZLE: 'puzzleValue',
  MYSTERY: 'mysteryValue',
  ELITE: 'eliteValue',
  FINAL_BOSS: 'bossValue',
};

export function encounterValue(config: GameConfig, type: EncounterType): number {
  return config[ENCOUNTER_VALUE_KEY[type]];
}

// GAME_DESIGN.md §6 / TECHNICAL_SPEC.md §6: encounter type -> target question difficulty.
export const ENCOUNTER_DIFFICULTY: Record<EncounterType, number> = {
  TREASURE: 2,
  BATTLE: 3,
  MYSTERY: 3,
  PUZZLE: 4,
  ELITE: 5,
  FINAL_BOSS: 5,
};

// TECHNICAL_SPEC.md §17: one shared icon per encounter type, centralized rather than per-node.
export const ENCOUNTER_ICON: Record<EncounterType, string> = {
  TREASURE: '\u{1F381}', // gift
  BATTLE: '⚔️', // crossed swords
  PUZZLE: '\u{1F9E9}', // puzzle piece
  MYSTERY: '❔', // white question mark
  ELITE: '\u{1F451}', // crown
  FINAL_BOSS: '\u{1F409}', // dragon
};

export const ENCOUNTER_LABEL: Record<EncounterType, string> = {
  TREASURE: 'Treasure',
  BATTLE: 'Battle',
  PUZZLE: 'Puzzle',
  MYSTERY: 'Mystery',
  ELITE: 'Elite',
  FINAL_BOSS: 'Final Boss',
};

export const START_ICON = '\u{1F6A9}'; // triangular flag

export const TEAM_ICONS = ['\u{1F6E1}️', '\u{1F5E1}️', '\u{1F3F9}', '\u{1F52E}'];

// By index (matching the default Red/Blue/Green/Yellow team names, but
// applied regardless of what a team is actually renamed to) - used to color
// each team's own token and traveled route on the map so multiple teams'
// paths stay individually traceable once they converge or cross. Picked for
// contrast against the parchment map background specifically (a true
// yellow/gold reads too close to the parchment's own hue, same issue the
// path-glow color hit earlier).
export const TEAM_COLORS = ['#b6392b', '#2f6fb0', '#3f8a4f', '#c9862e'];
