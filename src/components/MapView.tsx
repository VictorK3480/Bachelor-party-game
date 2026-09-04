import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../types';
import { TEAM_COLORS } from '../game/config';
import EncounterGlyph from './EncounterGlyph';
import MapLegend from './MapLegend';

interface Props {
  state: GameState;
  availableNodeIds: string[];
}

const HEIGHT = 1000;
// The map-frame's own on-screen box is usually much wider than tall (a full
// viewport-width strip, height-limited by the header/scoreboard/panel), but
// matching that exactly stretches the graph so flat that connections become
// near-horizontal lines spanning almost the whole screen - hard to trace and
// wastes the vertical room. Capping the aspect ratio keeps the map using
// real vertical space and keeps individual connections reasonably short,
// while the parchment background (a separate layer, not this SVG) still
// goes full-bleed regardless of how much of it the graph itself occupies.
// Squished ~1/3 narrower than before (each value * 2/3) per request - the
// map still measures the container live and clamps into this range, just a
// narrower one.
const MIN_ASPECT = 0.75;
const MAX_ASPECT = 1.0;
const DEFAULT_ASPECT = 0.9; // used for the first paint, before ResizeObserver reports

function nodeRadius(nodeId: string): number {
  return nodeId === 'start' ? 22 : 30;
}

interface NodeObstacle {
  id: string;
  x: number;
  y: number;
  r: number;
}

function cubicBezierPoint(
  x1: number, y1: number, c1x: number, c1y: number, c2x: number, c2y: number, x2: number, y2: number, t: number
): [number, number] {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return [a * x1 + b * c1x + c * c2x + d * x2, a * y1 + b * c1y + c * c2y + d * y2];
}

// Two chained cubic segments through a shared midpoint ("apex"), built so
// the curve leaves node 1 and arrives at node 2 on a purely vertical tangent
// - progression should always read as "moving up the map," never sideways,
// no matter how far apart two connected lanes are horizontally (some jumps
// span most of the map's width by design - see the convergence rule in
// map.ts). The apex itself can be nudged sideways (apexOffset) - that's
// where the horizontal travel actually happens, in the middle of the curve,
// away from either node - which is also the lever used to steer the curve
// clear of unrelated nodes it would otherwise swing through.
function routeGeometry(x1: number, y1: number, x2: number, y2: number, apexOffset: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const midX = (x1 + x2) / 2 + apexOffset;
  const midY = (y1 + y2) / 2;
  const vertReach = Math.abs(dy) * 0.58;
  const ySign = dy >= 0 ? 1 : -1;
  const chordLen = Math.hypot(dx, dy) || 1;
  const tx = dx / chordLen;
  const ty = dy / chordLen;
  const apexTangentLen = chordLen * 0.15;
  return {
    midX,
    midY,
    // Control points at each endpoint sit directly above/below it (same x)
    // - a 0-degree-from-vertical tangent, comfortably inside "at most 45
    // degrees." Only the apex's own control points lean toward the chord
    // direction, which is where the curve is allowed to actually travel
    // sideways.
    c1x: x1,
    c1y: y1 + vertReach * ySign,
    c2x: midX - tx * apexTangentLen,
    c2y: midY - ty * apexTangentLen,
    c3x: midX + tx * apexTangentLen,
    c3y: midY + ty * apexTangentLen,
    c4x: x2,
    c4y: y2 - vertReach * ySign,
  };
}

function pointOnRoute(x1: number, y1: number, x2: number, y2: number, apexOffset: number, t: number): [number, number] {
  const g = routeGeometry(x1, y1, x2, y2, apexOffset);
  if (t <= 0.5) {
    return cubicBezierPoint(x1, y1, g.c1x, g.c1y, g.c2x, g.c2y, g.midX, g.midY, t * 2);
  }
  return cubicBezierPoint(g.midX, g.midY, g.c3x, g.c3y, g.c4x, g.c4y, x2, y2, (t - 0.5) * 2);
}

function routePath(x1: number, y1: number, x2: number, y2: number, apexOffset: number): string {
  const g = routeGeometry(x1, y1, x2, y2, apexOffset);
  return `M ${x1} ${y1} C ${g.c1x} ${g.c1y}, ${g.c2x} ${g.c2y}, ${g.midX} ${g.midY} C ${g.c3x} ${g.c3y}, ${g.c4x} ${g.c4y}, ${x2} ${y2}`;
}

const ROUTE_SAMPLE_TS = [0.15, 0.3, 0.5, 0.7, 0.85];

// Picks how far sideways the apex should sit by sampling several candidate
// offsets and checking each against every *other* node's circle - if the
// direct route (apex at the horizontal midpoint) would swing through an
// unrelated node, this tries increasingly wide offsets to either side and
// keeps whichever candidate has the least (ideally zero) penetration into
// another node's footprint.
function chooseApexOffset(x1: number, y1: number, x2: number, y2: number, fromId: string, toId: string, obstacles: NodeObstacle[]) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const step = Math.max(30, len * 0.14);
  const candidateOffsets = [0, step, -step, step * 2.2, -step * 2.2, step * 3.6, -step * 3.6];

  function penaltyFor(apexOffset: number) {
    let penalty = 0;
    for (const t of ROUTE_SAMPLE_TS) {
      const [px_, py_] = pointOnRoute(x1, y1, x2, y2, apexOffset, t);
      for (const obs of obstacles) {
        if (obs.id === fromId || obs.id === toId) continue;
        const clearance = obs.r + 16;
        const d = Math.hypot(px_ - obs.x, py_ - obs.y);
        if (d < clearance) penalty += clearance - d;
      }
    }
    return penalty;
  }

  let bestOff = candidateOffsets[0];
  let bestPenalty = Infinity;
  for (const off of candidateOffsets) {
    const penalty = penaltyFor(off);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestOff = off;
    }
    if (penalty === 0) break;
  }
  return bestOff;
}

// Each team's own ordered sequence of visited nodes (turnHistory is a flat,
// chronological log across all teams together - this reconstructs the
// individual trail each team actually walked, node by node).
function computeTeamPaths(state: GameState): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  for (const team of state.teams) paths.set(team.id, ['start']);
  for (const record of state.turnHistory) {
    paths.get(record.teamId)?.push(record.nodeId);
  }
  return paths;
}

// Which team(s) actually traversed a given edge, keyed by "fromId->toId".
// More accurate than checking whether both endpoints were merely visited by
// *some* team - two teams can each visit different nodes independently
// without ever having walked the specific edge connecting them.
function computeEdgeTeams(teamPaths: Map<string, string[]>): Map<string, string[]> {
  const edgeTeams = new Map<string, string[]>();
  for (const [teamId, path] of teamPaths) {
    for (let i = 0; i < path.length - 1; i++) {
      const key = `${path[i]}->${path[i + 1]}`;
      const list = edgeTeams.get(key) ?? [];
      list.push(teamId);
      edgeTeams.set(key, list);
    }
  }
  return edgeTeams;
}

// Every remaining node the current team could still reach by choosing
// differently later - as opposed to a sibling branch they've already passed
// by and can never return to. Only the latter is a "locked" dead branch;
// everything else should stay legible even before the team gets there.
function computeReachable(map: GameState['map'], fromId: string): Set<string> {
  const reachable = new Set<string>();
  const queue = [fromId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const targetId of map[id]?.connections ?? []) queue.push(targetId);
  }
  return reachable;
}

// GAME_DESIGN.md §15 / TECHNICAL_SPEC.md §17: nodes with shared per-type
// icons, visible paths between them, and team tokens that visually
// distinguish teams sharing a node. Available/visited/dormant styling and
// the active-team glow are purely presentational - fog-of-war on
// not-yet-relevant nodes keeps the current decision the visual focus
// instead of showing the whole map at full intensity at once.
export default function MapView({ state, availableNodeIds }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;
      setAspect(Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const WIDTH = Math.round(HEIGHT * aspect);
  const PAD_X = Math.round(WIDTH * 0.075);
  const PAD_Y_TOP = 90;
  // The node-select panel (prompt + choice buttons) overlays the bottom of the
  // frame - see .node-select-panel in styles.css. y=1 (the start row's
  // neighbors) needs real clearance from it, more than layer 9 (y=0) needs
  // at the top.
  const PAD_Y_BOTTOM = 150;

  function px(x: number): number {
    return PAD_X + x * (WIDTH - PAD_X * 2);
  }
  function py(y: number): number {
    return PAD_Y_TOP + y * (HEIGHT - PAD_Y_TOP - PAD_Y_BOTTOM);
  }

  const nodes = Object.values(state.map);
  const available = new Set(availableNodeIds);
  const visited = new Set(['start', ...state.turnHistory.map((r) => r.nodeId)]);
  const currentTeam = state.teams[state.currentTeamIndex];
  const reachable = computeReachable(state.map, currentTeam.position);
  const edgeTeams = computeEdgeTeams(computeTeamPaths(state));
  const teamColorById = new Map(state.teams.map((team, i) => [team.id, TEAM_COLORS[i % TEAM_COLORS.length]]));
  const nodeObstacles: NodeObstacle[] = nodes.map((n) => ({
    id: n.id,
    x: px(n.x),
    y: py(n.y),
    r: nodeRadius(n.id),
  }));

  const teamsByNode = new Map<string, GameState['teams']>();
  for (const team of state.teams) {
    const list = teamsByNode.get(team.position) ?? [];
    list.push(team);
    teamsByNode.set(team.position, list);
  }

  return (
    <div className="map-frame" ref={frameRef}>
      <MapLegend map={state.map} />
      <svg className="map-view" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Displaces every stroked path through a noise field so straight
              bezier curves read as hand-drawn rather than vector-clean.
              Kept subtle (a low scale) - too much displacement is what was
              making routes read as "dragged out" and hard to trace back to
              their actual endpoints. */}
          <filter id="rough-path" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {(['start', 'treasure', 'battle', 'puzzle', 'mystery', 'elite'] as const).map((key) => (
            <radialGradient key={key} id={`grad-${key}`} cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor={`var(--c-${key}-light)`} />
              <stop offset="55%" stopColor={`var(--c-${key})`} />
              <stop offset="100%" stopColor={`var(--c-${key}-dark)`} />
            </radialGradient>
          ))}
        </defs>

        <g className="map-paths">
          {nodes.flatMap((node) =>
            node.connections.map((targetId) => {
              const target = state.map[targetId];
              if (!target) return null;
              const x1 = px(node.x);
              const y1 = py(node.y);
              const x2 = px(target.x);
              const y2 = py(target.y);
              const isNextChoice = node.id === currentTeam.position && available.has(targetId);
              const apexOffset = chooseApexOffset(x1, y1, x2, y2, node.id, targetId, nodeObstacles);

              // Priority: the current team's live choice always gets the
              // gold glow, even if some team's history also used this edge -
              // that's the single most actionable thing on the map right now.
              if (isNextChoice) {
                return (
                  <path
                    key={`${node.id}-${targetId}`}
                    d={routePath(x1, y1, x2, y2, apexOffset)}
                    className="map-path map-path-next"
                    pathLength={1}
                  />
                );
              }

              const walkedTeamIds = edgeTeams.get(`${node.id}->${targetId}`) ?? [];
              if (walkedTeamIds.length === 0) {
                return (
                  <path
                    key={`${node.id}-${targetId}`}
                    d={routePath(x1, y1, x2, y2, apexOffset)}
                    className="map-path map-path-dormant"
                    pathLength={1}
                  />
                );
              }

              // Each team that walked this edge gets its own colored arc,
              // nudged sideways at the apex only (on top of the collision-
              // avoiding offset above) - the two endpoints stay exactly on
              // the shared node either way, same as multiple transit lines
              // converging on one station. Otherwise converging teams'
              // routes would stack into one indistinguishable line right
              // where telling them apart matters most.
              const laneSpacing = 20;
              return (
                <g key={`${node.id}-${targetId}`}>
                  {walkedTeamIds.map((teamId, i) => (
                    <path
                      key={teamId}
                      d={routePath(x1, y1, x2, y2, apexOffset + (i - (walkedTeamIds.length - 1) / 2) * laneSpacing)}
                      className="map-path map-path-walked"
                      style={{ stroke: teamColorById.get(teamId) }}
                      pathLength={1}
                    />
                  ))}
                </g>
              );
            })
          )}
        </g>

        <g className="map-nodes">
          {nodes.map((node) => {
            const radius = node.id === 'start' ? 22 : 30;
            const isAvailable = available.has(node.id);
            const isVisited = visited.has(node.id);
            const stateClass = isAvailable
              ? 'node-available'
              : isVisited
              ? 'node-visited'
              : reachable.has(node.id)
              ? 'node-dormant'
              : 'node-locked';
            const bevelRadius = radius - 1.5;
            const bevelCircumference = 2 * Math.PI * bevelRadius;
            const rimArc = bevelCircumference * 0.34;
            const rimDash = `${rimArc} ${bevelCircumference - rimArc}`;
            // Every stroke width here is derived from radius rather than a
            // flat CSS value, so they stay visually proportional across the
            // two node sizes (start/normal) instead of looking uneven.
            const circleStroke = radius * 0.1;
            const rimStroke = radius * 0.09;
            // Both grown ~20% together (not just the glyph) so the glyph
            // still sits comfortably inside its plate instead of poking
            // past the edge.
            const plateRadius = radius * 0.8;
            const plateStroke = radius * 0.05;

            return (
              <g
                key={node.id}
                className={`map-node ${stateClass}`}
                transform={`translate(${px(node.x)}, ${py(node.y)})`}
              >
                {isAvailable && <circle r={radius + 12} className="node-pulse-ring" />}
                <circle
                  r={radius}
                  className={`node-circle node-${node.encounterType ?? 'START'}`}
                  strokeWidth={circleStroke}
                />
                {/* Rim-light/rim-shadow arcs plus a specular blob fake a beveled,
                    top-lit orb instead of a flat-filled disc. */}
                <circle
                  r={bevelRadius}
                  className="node-rim-shadow"
                  strokeDasharray={rimDash}
                  strokeWidth={rimStroke * 1.15}
                  transform="rotate(50)"
                />
                <circle
                  r={bevelRadius}
                  className="node-rim-light"
                  strokeDasharray={rimDash}
                  strokeWidth={rimStroke}
                  transform="rotate(-130)"
                />
                <ellipse
                  cx={-radius * 0.32}
                  cy={-radius * 0.4}
                  rx={radius * 0.32}
                  ry={radius * 0.18}
                  className="node-specular"
                  transform="rotate(-20)"
                />
                {/* A light stamped medallion behind the glyph guarantees
                    contrast regardless of the node's own type color - sized
                    up so the glyph itself has less dead padding to the rim. */}
                <circle r={plateRadius} className="node-icon-plate" strokeWidth={plateStroke} />
                <g transform={`scale(${radius / 12.9})`}>
                  <EncounterGlyph type={node.encounterType ?? 'START'} />
                </g>
                {isVisited && !isAvailable && node.id !== 'start' && (
                  <g className="node-visited-badge">
                    <circle r={11} cx={radius - 8} cy={-radius + 8} />
                    <text textAnchor="middle" dominantBaseline="central" x={radius - 8} y={-radius + 9}>
                      ✓
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        <g className="map-tokens">
          {nodes.flatMap((node) => {
            const teams = teamsByNode.get(node.id);
            if (!teams || teams.length === 0) return [];
            const stackAbove = node.y > 0.03; // keep tokens on-canvas near the very top row (layer 9)
            // 'start' is the one node every team is guaranteed to share at
            // once, and it sits only ~76 units from the layer-1 row above
            // it (radius 30) - there's well under 24 units of genuinely
            // free vertical band between the two node edges, not enough for
            // a normal-sized token stack to clear both sides. Shrinking the
            // token itself when several teams pile up is what actually
            // fixes it, not pushing it further out (that just trades an
            // overlap with the start node for one with the row above).
            const crowded = teams.length > 2;
            // ~20% bigger than before across the board (radius, spacing,
            // clearance) - re-verified visually afterward since 'start's
            // clearance in particular was hand-tuned against a tight gap.
            const tokenRadius = crowded ? 16 : 23;
            const spacing = crowded ? 20 : 31;
            const clearance = crowded ? 30 : 50;
            const tokenY = stackAbove ? py(node.y) - clearance : py(node.y) + clearance;
            return teams.map((team, i) => {
              const offset = (i - (teams.length - 1) / 2) * spacing;
              const isActive = team.id === currentTeam.id;
              return (
                <g
                  key={team.id}
                  className={`team-token ${isActive ? 'team-token-active' : ''}`}
                  style={{ transform: `translate(${px(node.x) + offset}px, ${tokenY}px)` }}
                >
                  {isActive && <circle r={tokenRadius + 7} className="team-token-glow" strokeWidth={tokenRadius * 0.13} />}
                  <circle
                    r={tokenRadius}
                    className="team-token-circle"
                    strokeWidth={tokenRadius * 0.16}
                    style={{ stroke: teamColorById.get(team.id) }}
                  />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={tokenRadius * 1.15}>
                    {team.icon}
                  </text>
                </g>
              );
            });
          })}
        </g>
      </svg>
    </div>
  );
}
