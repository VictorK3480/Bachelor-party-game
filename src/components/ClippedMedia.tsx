import { useRef } from 'react';

interface Props {
  kind: 'audio' | 'video';
  src: string;
  clipStart?: number;
  clipEnd?: number;
  restricted: boolean;
  className?: string;
}

// Some spicy questions should only reveal a short excerpt before the answer
// is shown (e.g. 1-4s of a clip), with the full file only playable once the
// GM reveals the answer - CONTENT_GUIDE.md §2. `restricted` gates that:
// true clamps playback/seeking to [clipStart, clipEnd] (a pause, not a
// content edit - the rest of the file is still there, just not reachable
// yet); false (post-reveal) removes the clamp entirely so the GM can play,
// pause, and scrub the whole thing normally. Native <audio>/<video>
// `controls` already give pause for free, satisfying "should be pausable."
export default function ClippedMedia({ kind, src, clipStart, clipEnd, restricted, className }: Props) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  function clampIfRestricted() {
    const el = ref.current;
    if (!el || !restricted) return;
    if (clipStart !== undefined && el.currentTime < clipStart) {
      el.currentTime = clipStart;
    }
    if (clipEnd !== undefined && el.currentTime >= clipEnd) {
      el.pause();
      el.currentTime = clipEnd;
    }
  }

  function handleLoadedMetadata() {
    const el = ref.current;
    if (el && restricted && clipStart !== undefined) {
      el.currentTime = clipStart;
    }
  }

  const commonProps = {
    ref,
    className,
    src,
    controls: true,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: clampIfRestricted,
    onSeeked: clampIfRestricted,
  };

  return kind === 'audio' ? <audio {...commonProps} /> : <video {...commonProps} />;
}
