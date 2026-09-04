import { useMemo } from 'react';
import { TEAM_COLORS } from '../game/config';

const COLORS = [...TEAM_COLORS, '#f4c669', '#6fe0a0'];
const PIECE_COUNT = 90;

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
  round: boolean;
  size: number;
}

// Winner-screen-only celebratory burst (ResultsScreen.tsx). Pure CSS
// keyframe animation, no external library - stays consistent with the
// project's offline-only, no-external-dependency constraints
// (TECHNICAL_SPEC.md §1). Each piece falls once and fades out; it doesn't
// loop, so it doesn't run forever in the background of the results screen.
export default function Confetti() {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.4,
        duration: 2.6 + Math.random() * 2.2,
        rotation: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.35,
        size: 7 + Math.random() * 6,
      })),
    []
  );

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`confetti-piece ${p.round ? 'confetti-round' : ''}`}
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 0.4}px`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              // The fall animation itself drives `transform` (see
              // @keyframes confetti-fall) - an inline `transform` here would
              // just be discarded once the animation starts, so the
              // per-piece randomized spin amount is passed through as a
              // custom property instead, which the keyframes' end state
              // reads via rotate(var(--confetti-spin)).
              '--confetti-spin': `${360 + p.rotation}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
