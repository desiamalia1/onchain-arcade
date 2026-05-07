import { useEffect, useRef, useState } from 'react';

type Props = {
  resetKey: number;
  onScore: (score: number, gameOver: boolean) => void;
};

const W = 420;
const H = 560;
const GRAVITY = 0.45;
const FLAP = -7.5;
const PIPE_W = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 2.4;

type Pipe = { x: number; gapY: number; passed: boolean };

export function Flappy({ resetKey, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);

  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  useEffect(() => {
    onScoreRef.current(score, over);
  }, [score, over]);

  useEffect(() => {
    setScore(0);
    setOver(false);
    setStarted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    let birdY = H / 2;
    let birdVy = 0;
    const birdX = 100;
    const birdR = 14;
    let pipes: Pipe[] = [];
    let frame = 0;
    let localScore = 0;
    let localOver = false;
    let localStarted = false;
    let raf = 0;

    function flap() {
      if (localOver) return;
      if (!localStarted) {
        localStarted = true;
        setStarted(true);
      }
      birdVy = FLAP;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        flap();
      }
    };
    const onClick = () => flap();
    const onTouch = (e: TouchEvent) => { e.preventDefault(); flap(); };

    window.addEventListener('keydown', onKey, { passive: false });
    canvas.addEventListener('mousedown', onClick);
    canvas.addEventListener('touchstart', onTouch, { passive: false });

    function spawnPipe() {
      const gapY = 80 + Math.random() * (H - 160 - PIPE_GAP);
      pipes.push({ x: W + 10, gapY, passed: false });
    }

    function loop() {
      frame++;

      if (localStarted && !localOver) {
        birdVy += GRAVITY;
        birdY += birdVy;

        // Spawn pipes
        if (frame % 90 === 0) spawnPipe();

        // Update pipes
        for (const p of pipes) p.x -= PIPE_SPEED;
        pipes = pipes.filter((p) => p.x + PIPE_W > -5);

        // Score (passing pipe center)
        for (const p of pipes) {
          if (!p.passed && p.x + PIPE_W < birdX) {
            p.passed = true;
            localScore++;
            setScore(localScore);
          }
        }

        // Collision with floor / ceiling
        if (birdY + birdR > H - 20 || birdY - birdR < 0) {
          localOver = true;
        }
        // Pipe collision
        for (const p of pipes) {
          if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_W) {
            if (birdY - birdR < p.gapY || birdY + birdR > p.gapY + PIPE_GAP) {
              localOver = true;
              break;
            }
          }
        }
      }

      // Render
      // sky
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ground
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, H - 20, W, 20);
      ctx.fillStyle = '#475569';
      for (let i = 0; i < W; i += 16) {
        ctx.fillRect(i, H - 20, 8, 4);
      }

      // pipes
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3;
      for (const p of pipes) {
        // top
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.strokeRect(p.x, 0, PIPE_W, p.gapY);
        ctx.fillRect(p.x - 4, p.gapY - 16, PIPE_W + 8, 16);
        ctx.strokeRect(p.x - 4, p.gapY - 16, PIPE_W + 8, 16);
        // bottom
        ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_W, H - p.gapY - PIPE_GAP - 20);
        ctx.strokeRect(p.x, p.gapY + PIPE_GAP, PIPE_W, H - p.gapY - PIPE_GAP - 20);
        ctx.fillRect(p.x - 4, p.gapY + PIPE_GAP, PIPE_W + 8, 16);
        ctx.strokeRect(p.x - 4, p.gapY + PIPE_GAP, PIPE_W + 8, 16);
      }

      // bird
      ctx.save();
      ctx.translate(birdX, birdY);
      const angle = Math.max(-0.5, Math.min(1.2, birdVy / 12));
      ctx.rotate(angle);
      // body
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, birdR, 0, Math.PI * 2);
      ctx.fill();
      // wing
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-3, 2, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(5, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(6, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(birdR - 2, -2);
      ctx.lineTo(birdR + 8, 0);
      ctx.lineTo(birdR - 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // HUD
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 36px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(localScore), W / 2, 60);

      if (!localStarted) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Inter, system-ui, sans-serif';
        ctx.fillText('Tap / Space to flap', W / 2, H / 2);
      }

      if (localOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 32px Inter, system-ui, sans-serif';
        ctx.fillText('Game Over', W / 2, H / 2 - 10);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '16px Inter, system-ui, sans-serif';
        ctx.fillText(`Score: ${localScore}`, W / 2, H / 2 + 20);
        setOver(true);
        setScore(localScore);
        return;
      }

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('mousedown', onClick);
      canvas.removeEventListener('touchstart', onTouch);
    };
  }, [resetKey]);

  return (
    <div className="board-wrap">
      <div className="stats">
        <div className="stat"><label>Score</label><span>{score}</span></div>
        <div className="stat"><label>Status</label><span>{over ? 'Dead' : started ? 'Flying' : 'Ready'}</span></div>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
      <div className="hint">
        <span className="kbd">Space</span> · click · tap to flap · Pass between pipes
      </div>
    </div>
  );
}
