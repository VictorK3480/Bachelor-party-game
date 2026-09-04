import type { EncounterType, GameState } from '../types';
import { ENCOUNTER_LABEL } from '../game/config';
import EncounterGlyph from './EncounterGlyph';

interface Props {
  map: GameState['map'];
}

const LEGEND_TYPES: EncounterType[] = ['TREASURE', 'BATTLE', 'PUZZLE', 'MYSTERY', 'ELITE'];

// GAME_DESIGN.md §15: a corner-anchored, always-visible key so the icon-only
// node glyphs stay readable without needing a label (or its point value)
// spelled out under every single node - that text was doubling as visual
// clutter crossing the path lines. Every node of a given type is generated
// with the same value (see map.ts), so any one of them tells us the value
// for the whole type.
export default function MapLegend({ map }: Props) {
  const valueByType = new Map<EncounterType, number>();
  for (const node of Object.values(map)) {
    if (node.encounterType && !valueByType.has(node.encounterType)) {
      valueByType.set(node.encounterType, node.value);
    }
  }

  return (
    <div className="map-legend">
      <div className="map-legend-panel">
        {LEGEND_TYPES.map((type) => (
          <div key={type} className="map-legend-row">
            <svg viewBox="-11 -11 22 22" className="map-legend-icon" aria-hidden="true">
              <circle r={10} className="node-icon-plate" />
              <EncounterGlyph type={type} />
            </svg>
            <span>
              {ENCOUNTER_LABEL[type]} <span className="map-legend-value">±{valueByType.get(type) ?? '?'}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
