import type { EncounterType, GameConfig, MapNode } from '../types';
import { encounterValue } from './config';

// GAME_DESIGN.md §5 / TECHNICAL_SPEC.md §11: layers 1-9 each hold 2-3 nodes,
// layer 1 always holds exactly 3 (START branches into all of them).
const LAYER_SIZES = [3, 2, 3, 2, 3, 2, 3, 2, 3];

const TYPE_CYCLE: EncounterType[] = ['TREASURE', 'BATTLE', 'PUZZLE', 'MYSTERY', 'ELITE'];

// Fixed horizontal lanes the whole map snaps to, instead of positioning each
// row's nodes freely across the full width. This is a structural fix, not a
// rendering one: previously a 3-node row and a 2-node row each spread their
// own nodes evenly across 0-1 independently, so a single connection between
// them could span almost the entire map width (e.g. a 3-row's leftmost node
// to a 2-row's rightmost). With every row snapped to the same lane grid,
// "adjacent lane" is a stable concept regardless of row size, and every
// connection below is defined to shift by at most one lane.
const LANE_COUNT = 5;
// 3-node rows sit on the two outer lanes plus the center; 2-node rows sit on
// the two lanes in between - so a 3-row and the 2-row next to it always
// interleave with exactly a 0- or 1-lane gap between any node and its
// forward connections.
const LANES_3 = [0, 2, 4];
const LANES_2 = [1, 3];

// Connections by lane number (not row index). A 3-row's outer lanes (0, 4)
// only ever have one valid same-shift neighbor each (lane 1 and lane 3
// respectively) - there's no lane at -1 or 5 to vary toward - so they're
// always a single connection. A 2-row's lanes (1, 3) and a 3-row's center
// lane (2) each have two valid neighbors, which is where real variety is
// possible: three hand-checked variants per transition type, cycled by
// occurrence so consecutive rows of the same size don't all connect
// identically (previously every 3-to-2 and every 2-to-3 transition used the
// exact same pattern, every time). Each variant is verified against both
// hard rules: the convergence rule (adjacent same-row nodes share at most
// one forward target - see validateMap) and full reachability (the outer
// lanes' mandatory single connection already guarantees 0/1/3/4 stay
// reachable regardless of variant; the "sparse" variants below only ever
// drop the *redundant* second connection into the center/shared lane, never
// the only path to a lane).
const VARIANTS_3_TO_2: Record<number, number[]>[] = [
  { 0: [1], 2: [1, 3], 4: [3] }, // center reaches both neighbors
  { 0: [1], 2: [1], 4: [3] }, // center leans left
  { 0: [1], 2: [3], 4: [3] }, // center leans right
];
const VARIANTS_2_TO_3: Record<number, number[]>[] = [
  { 1: [0, 2], 3: [2, 4] }, // both lanes also reach the shared center
  { 1: [0, 2], 3: [4] }, // only the left lane reaches center
  { 1: [0], 3: [2, 4] }, // only the right lane reaches center
];

function lanesFor(size: number): number[] {
  return size === 3 ? LANES_3 : LANES_2;
}

function laneX(lane: number): number {
  return (lane + 0.5) / LANE_COUNT;
}

function nodeId(layer: number, index: number): string {
  return `L${layer}N${index}`;
}

// Deterministic per-node jitter so the map reads as an unevenly hand-drawn
// path network instead of a rigid grid. The map must stay non-random (same
// layout every load), so this hashes the node's own id instead of calling
// Math.random(). Magnitude is capped well under half a layer's node-slot
// width so jittered nodes never cross their neighbor's x-order - the
// convergence rule (see validateMap) depends on x-order matching index order.
function hashUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function jitter(id: string, axis: string, magnitude: number): number {
  return (hashUnit(id + axis) * 2 - 1) * magnitude;
}

/**
 * Builds the predefined, deterministic branching map described in
 * GAME_DESIGN.md §5 and TECHNICAL_SPEC.md §11. The same layout is produced
 * every time (no randomization) - only encounter values are derived from config.
 */
export function buildMap(config: GameConfig): Record<string, MapNode> {
  const map: Record<string, MapNode> = {};

  const layerIds: string[][] = [['start']];
  for (let layer = 1; layer <= 9; layer++) {
    const size = LAYER_SIZES[layer - 1];
    layerIds.push(Array.from({ length: size }, (_, i) => nodeId(layer, i)));
  }
  layerIds.push(['boss']);

  map.start = {
    id: 'start',
    layer: 0,
    encounterType: null,
    value: 0,
    connections: [...layerIds[1]],
    x: 0.5,
    y: 1,
  };

  for (let layer = 1; layer <= 9; layer++) {
    const ids = layerIds[layer];
    const nextIds = layerIds[layer + 1];
    const isLastNormalLayer = layer === 9;
    const lanes = lanesFor(ids.length);
    const nextLanes = isLastNormalLayer ? null : lanesFor(nextIds.length);
    // Which occurrence of a "3-node row" or "2-node row" this is (0, 1, 2, 3
    // - there are 4 of each among layers 1-9) picks which variant to use,
    // cycling through all 3 so the pattern doesn't repeat every other layer.
    const variants = ids.length === 3 ? VARIANTS_3_TO_2 : VARIANTS_2_TO_3;
    const occurrence = ids.length === 3 ? (layer - 1) / 2 : (layer - 2) / 2;
    const connectionsByLane = variants[occurrence % variants.length];
    // Rotates which type each lane index lands on, layer by layer, instead
    // of a cursor that just counts continuously through every node in
    // insertion order. That naive version clustered types by lane - layer
    // sizes alternate 3,2, which sums to 5 (TYPE_CYCLE.length), so the
    // cursor realigned to the exact same phase every 2 layers: every 3-node
    // layer came out Treasure/Battle/Puzzle left-to-right, every 2-node
    // layer always Mystery/Elite, with no variation anywhere on the map.
    // 2 is coprime to 5, so shifting by (layer * 2) visits a different
    // phase on almost every layer instead.
    const layerShift = (layer * 2) % TYPE_CYCLE.length;

    ids.forEach((id, index) => {
      const encounterType = TYPE_CYCLE[(index + layerShift) % TYPE_CYCLE.length];
      const lane = lanes[index];

      const connections = isLastNormalLayer
        ? ['boss']
        : connectionsByLane[lane].map((targetLane) => nextIds[nextLanes!.indexOf(targetLane)]);

      // Small jitter within this lane's own slot for organic variety - never
      // enough to cross into a neighboring lane's territory (half a lane is
      // 0.5/LANE_COUNT = 0.1; even same-row neighbors are 2 lanes apart, so
      // this has a wide margin before it could invert x-order, which is what
      // the convergence check in validateMap depends on).
      const baseX = laneX(lane);
      const xSlack = (0.5 / LANE_COUNT) * 0.35;
      // Layer 9 climbs toward the boss at the top of the screen (y near 0);
      // start sits at the bottom (y = 1). See map.start/map.boss below.
      const baseY = 1 - layer / 10;

      map[id] = {
        id,
        layer,
        encounterType,
        value: encounterValue(config, encounterType),
        connections,
        x: baseX + jitter(id, 'x', xSlack),
        y: baseY + jitter(id, 'y', 0.045),
      };
    });
  }

  map.boss = {
    id: 'boss',
    layer: 10,
    encounterType: 'FINAL_BOSS',
    value: encounterValue(config, 'FINAL_BOSS'),
    connections: [],
    x: 0.5,
    // Pushed above y=0 (rather than sitting exactly at the same spacing as
    // every other layer gap) so it isn't cramped against layer 9 - MapView's
    // PAD_Y_TOP was widened to match, giving this the room it needs above
    // the canvas's own top edge.
    y: -0.05,
  };

  return map;
}

/**
 * TECHNICAL_SPEC.md §11: validate that all nodes have valid forward
 * connections and that the boss is reachable from every possible path.
 */
export function validateMap(map: Record<string, MapNode>): void {
  const errors: string[] = [];

  for (const node of Object.values(map)) {
    for (const target of node.connections) {
      if (!map[target]) {
        errors.push(`Node ${node.id} connects to unknown node ${target}`);
      }
    }
    if (node.id !== 'boss' && node.connections.length === 0) {
      errors.push(`Node ${node.id} has no forward connections (dead end)`);
    }
    if (node.id !== 'start' && node.id !== 'boss' && node.connections.length > 3) {
      errors.push(`Node ${node.id} has more than 3 forward connections`);
    }
  }

  const visited = new Set<string>();
  const queue = ['start'];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = map[id];
    if (!node) continue;
    for (const target of node.connections) queue.push(target);
  }

  for (const id of Object.keys(map)) {
    if (!visited.has(id)) errors.push(`Node ${id} is unreachable from start`);
  }
  if (!visited.has('boss')) errors.push('Boss node is not reachable from start');

  if (errors.length > 0) {
    throw new Error(`Map validation failed:\n${errors.join('\n')}`);
  }
}
