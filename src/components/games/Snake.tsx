import { useEffect, useRef, useState } from 'react';

type Props = {
  resetKey: number;
  onScore: (score: number, gameOver: boolean) => void;
};

const COLS = 20;
const ROWS = 20;
const CELL = 20;
const W = COLS * CELL;
const H = ROWS * CELL;

type Cell = { x: number; y: number };
type Dir = 'U' | 'D' | 'L' | 'R';

export function Snake({ resetKey, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  useEffect(() => {
    onScoreRef.current(score, over);
  }, [score, over]);

  useEffect(() => {
    setScore(0);
    setOver(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    let snake: Cell[] = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    let dir: Dir = 'R';
    let nextDir: Dir = 'R';
    let food: Cell = randomCell(snake);
    let localScore = 0;
    let localOver = false;
    let stepInterval = 130; // ms
    let lastStep = performance.now();
    let raf = 0;

    function randomCell(skip: Cell[]): Cell {
      while (true) {
        const c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        if (!skip.some((s) => s.x === c.x && s.y === c.y)) return c;
      }
    }

    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const map: Record<string, Dir> = {
        ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
        w: 'U', s: 'D', a: 'L', d: 'R', W: 'U', S: 'D', A: 'L', D: 'R',
      };
      const d = map[k];
      if (!d) return;
      e.preventDefault();
      // disallow reverse
      const opp: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
      if (opp[d] === dir) return;
      nextDir = d;
    };
    window.addEventListener('keydown', onKey, { passive: false });

    // Touch swipes
    let tx = 0, ty = 0;
    const onTouchStart = (e: TouchEvent) => {
      tx = e.changedTouches[0].clientX;
      ty = e.changedTouches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      const opp: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
      if (opp[d] !== dir) nextDir = d;
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    function step() {
      dir = nextDir;
      const head = { ...snake[0] };
      if (dir === 'U') head.y--;
      else if (dir === 'D') head.y++;
      else if (dir === 'L') head.x--;
      else head.x++;

      // Wall collision
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
        localOver = true;
        return;
      }
      // Self collision
      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        localOver = true;
        return;
      }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        localScore += 10;
        food = randomCell(snake);
        // small speed-up
        if (stepInterval > 70) stepInterval -= 2;
      } else {
        snake.pop();
      }
    }

    function render() {
      // bg
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0, 0, W, H);

      // grid
      ctx.strokeStyle = 'rgba(99,102,241,0.05)';
      ctx.lineWidth = 1;
      for (let i = 1; i < COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, H);
        ctx.stroke();
      }
      for (let i = 1; i < ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(W, i * CELL);
        ctx.stroke();
      }

      // food
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // snake
      for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const isHead = i === 0;
        ctx.fillStyle = isHead ? '#22c55e' : `hsl(${140 - i * 2}, 60%, ${40 + Math.max(0, 20 - i)}%)`;
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      }

      // HUD
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${localScore}`, 8, 16);

      if (localOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 28px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', W / 2, H / 2 - 8);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillText(`Score: ${localScore}`, W / 2, H / 2 + 18);
      }
    }

    function loop(now: number) {
      if (localOver) {
        render();
        setScore(localScore);
        setOver(true);
        return;
      }
      if (now - lastStep >= stepInterval) {
        step();
        lastStep = now;
        setScore(localScore);
      }
      render();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [resetKey]);

  return (
    <div className="board-wrap">
      <div className="stats">
        <div className="stat"><label>Score</label><span>{score}</span></div>
        <div className="stat"><label>Length</label><span>{Math.floor(score / 10) + 3}</span></div>
        <div className="stat"><label>Status</label><span>{over ? 'Dead' : 'Alive'}</span></div>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
      <div className="hint">
        Move: <span className="kbd">↑</span> <span className="kbd">↓</span> <span className="kbd">←</span>{' '}
        <span className="kbd">→</span> · Swipe on mobile · +10 per food
      </div>
    </div>
  );
}
