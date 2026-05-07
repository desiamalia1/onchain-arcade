import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addRandomTile,
  applyMove,
  emptyGrid,
  hasMoves,
  maxTile,
  type Direction,
  type Grid,
} from '../lib/game-logic';

const BEST_KEY = 'g2048_best';

function getBestLocal(): number {
  if (typeof localStorage === 'undefined') return 0;
  return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
}
function setBestLocal(v: number) {
  localStorage.setItem(BEST_KEY, String(v));
}

export type GameState = {
  grid: Grid;
  score: number;
  moves: number;
  over: boolean;
  won: boolean;
  bestLocal: number;
};

export function use2048() {
  const [grid, setGrid] = useState<Grid>(() => {
    const g = emptyGrid();
    addRandomTile(g);
    addRandomTile(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [bestLocal, setBest] = useState<number>(getBestLocal());

  const stateRef = useRef({ grid, score, over });
  stateRef.current = { grid, score, over };

  const move = useCallback((dir: Direction) => {
    const { grid: cur, over: isOver } = stateRef.current;
    if (isOver) return;
    const { grid: next, gained, changed } = applyMove(cur, dir);
    if (!changed) return;
    addRandomTile(next);
    setGrid(next);
    setScore((s) => {
      const ns = s + gained;
      if (ns > getBestLocal()) {
        setBestLocal(ns);
        setBest(ns);
      }
      return ns;
    });
    setMoves((m) => m + 1);
    if (!won && maxTile(next) >= 2048) setWon(true);
    if (!hasMoves(next)) setOver(true);
  }, [won]);

  const reset = useCallback(() => {
    const g = emptyGrid();
    addRandomTile(g);
    addRandomTile(g);
    setGrid(g);
    setScore(0);
    setMoves(0);
    setOver(false);
    setWon(false);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
        w: 'U', s: 'D', a: 'L', d: 'R',
        W: 'U', S: 'D', A: 'L', D: 'R',
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  return { grid, score, moves, over, won, bestLocal, move, reset };
}
