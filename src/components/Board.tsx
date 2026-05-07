import { useRef } from 'react';
import type { Direction, Grid } from '../lib/game-logic';

type Props = {
  grid: Grid;
  onMove: (dir: Direction) => void;
};

export function Board({ grid, onMove }: Props) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) onMove(dx > 0 ? 'R' : 'L');
    else onMove(dy > 0 ? 'D' : 'U');
  };

  return (
    <div className="board" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {grid.flatMap((row, r) =>
        row.map((v, c) => (
          <div key={`${r}-${c}`} className="tile" data-v={v}>
            {v === 0 ? '' : v}
          </div>
        )),
      )}
    </div>
  );
}
