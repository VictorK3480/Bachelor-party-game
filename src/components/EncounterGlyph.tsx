import type { EncounterType } from '../types';

type GlyphType = EncounterType | 'START';

// Simple, high-contrast silhouettes drawn in a -10..10 box, filled with a
// single ink color and stamped on a light plate (see .node-icon-plate in
// MapView) - unlike color emoji, a plain fill can't be restyled per node
// state (dormant/locked/available), and several of the emoji read poorly
// against their own type color. One consistent dark-glyph-on-light-plate
// pairing keeps every icon legible regardless of node color.
export default function EncounterGlyph({ type }: { type: GlyphType }) {
  switch (type) {
    case 'TREASURE':
      return (
        <g className="node-glyph">
          <path d="M -8,0 A 8,7 0 0 1 8,0 Z" />
          <rect x={-8} y={0} width={16} height={8} rx={1.5} />
          <rect x={-1.3} y={1.2} width={2.6} height={3} rx={0.6} fill="var(--ink)" />
        </g>
      );
    case 'BATTLE': {
      const sword = (
        <g>
          <polygon points="0,-9 1.2,-1.5 -1.2,-1.5" />
          <rect x={-3.2} y={-2} width={6.4} height={1.3} rx={0.4} />
          <rect x={-0.7} y={-0.8} width={1.4} height={3} rx={0.3} />
          <circle cx={0} cy={2.6} r={1.1} />
        </g>
      );
      return (
        <g className="node-glyph">
          <g transform="rotate(-40)">{sword}</g>
          <g transform="rotate(40)">{sword}</g>
        </g>
      );
    }
    case 'PUZZLE':
      return (
        <g className="node-glyph">
          <rect x={-8} y={-8} width={7} height={7} rx={1.6} />
          <rect x={1} y={-8} width={7} height={7} rx={1.6} />
          <rect x={-8} y={1} width={7} height={7} rx={1.6} />
          <rect x={1} y={1} width={7} height={7} rx={1.6} />
        </g>
      );
    case 'MYSTERY':
      return (
        <g className="node-glyph">
          <text textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={900} fontFamily="Georgia, serif">
            ?
          </text>
        </g>
      );
    case 'ELITE':
      return (
        <g className="node-glyph">
          <path d="M -9,2 L -9,-5 L -4.5,0 L 0,-8 L 4.5,0 L 9,-5 L 9,2 Z" />
        </g>
      );
    case 'FINAL_BOSS':
      return (
        <g className="node-glyph">
          <polygon points="-5,-6 -7.5,-11 -3,-7" />
          <polygon points="5,-6 7.5,-11 3,-7" />
          <circle cx={0} cy={-1} r={7} />
          <circle cx={-2.6} cy={-2} r={1.6} fill="var(--ink)" />
          <circle cx={2.6} cy={-2} r={1.6} fill="var(--ink)" />
          <rect x={-3} y={3} width={6} height={1.4} rx={0.5} fill="var(--ink)" />
        </g>
      );
    case 'START':
      return (
        <g className="node-glyph">
          <rect x={-0.8} y={-9} width={1.6} height={18} rx={0.5} />
          <polygon points="0.8,-9 8,-6.5 0.8,-4" />
        </g>
      );
    default:
      return null;
  }
}
