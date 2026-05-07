import { useEffect, useRef, useState } from 'react';

type Props = {
  resetKey: number;
  onScore: (score: number, gameOver: boolean) => void;
};

const W = 420;
const H = 560;

type Asteroid = { x: number; y: number; r: number; vx: number; vy: number };
type Star = { x: number; y: number; z: number };

export function Runner({ resetKey, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const stateRef = useRef({ over: false });

  // Keep callbacks fresh
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  useEffect(() => {
    onScoreRef.current(score, over);
  }, [score, over]);

  useEffect(() => {
    setScore(0);
    setOver(false);
    stateRef.current.over = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // Game state (mutable, not React)
    let rocketY = H / 2;
    let rocketVy = 0;
    const rocketX = 80;
    const rocketSize = 22;
    const keys = { up: false, down: false };
    const asteroids: Asteroid[] = [];
    const stars: Star[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      z: Math.random() * 0.7 + 0.3,
    }));

    let frame = 0;
    let scrollSpeed = 3;
    let spawnCooldown = 0;
    let localScore = 0;
    let localOver = false;
    let raf = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { keys.up = true; e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { keys.down = true; e.preventDefault(); }
      else if (e.key === ' ' && localOver) { /* handled by reset button */ }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
    };

    // Touch controls — top half = up, bottom half = down
    let touchActive: 'up' | 'down' | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const t = e.changedTouches[0];
      const y = t.clientY - rect.top;
      touchActive = y < rect.height / 2 ? 'up' : 'down';
      if (touchActive === 'up') keys.up = true; else keys.down = true;
    };
    const onTouchEnd = () => {
      keys.up = false; keys.down = false; touchActive = null;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);

    function spawnAsteroid() {
      const r = 12 + Math.random() * 22;
      asteroids.push({
        x: W + r,
        y: Math.random() * (H - 2 * r) + r,
        r,
        vx: -(scrollSpeed + Math.random() * 1.5),
        vy: (Math.random() - 0.5) * 1.2,
      });
    }

    function drawRocket(x: number, y: number) {
      ctx.save();
      ctx.translate(x, y);
      // flame
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-rocketSize, -6);
      ctx.lineTo(-rocketSize - 10 - Math.random() * 6, 0);
      ctx.lineTo(-rocketSize, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-rocketSize, -3);
      ctx.lineTo(-rocketSize - 6, 0);
      ctx.lineTo(-rocketSize, 3);
      ctx.closePath();
      ctx.fill();
      // body
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-rocketSize, -10);
      ctx.lineTo(rocketSize - 6, -10);
      ctx.lineTo(rocketSize + 4, 0);
      ctx.lineTo(rocketSize - 6, 10);
      ctx.lineTo(-rocketSize, 10);
      ctx.closePath();
      ctx.fill();
      // window
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(rocketSize / 2, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      // fins
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(-rocketSize, -10);
      ctx.lineTo(-rocketSize - 8, -16);
      ctx.lineTo(-rocketSize + 4, -10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-rocketSize, 10);
      ctx.lineTo(-rocketSize - 8, 16);
      ctx.lineTo(-rocketSize + 4, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawAsteroid(a: Asteroid) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sides = 8;
      for (let i = 0; i < sides; i++) {
        const ang = (i / sides) * Math.PI * 2;
        const rr = a.r * (0.85 + 0.3 * Math.sin(ang * 3 + a.x * 0.05));
        const px = Math.cos(ang) * rr;
        const py = Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // crater
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(-a.r * 0.3, -a.r * 0.2, a.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function loop() {
      if (localOver) return;
      frame++;

      // Update rocket
      if (keys.up) rocketVy -= 0.6;
      if (keys.down) rocketVy += 0.6;
      rocketVy *= 0.9;
      rocketY += rocketVy;
      if (rocketY < 20) { rocketY = 20; rocketVy = 0; }
      if (rocketY > H - 20) { rocketY = H - 20; rocketVy = 0; }

      // Update stars
      for (const s of stars) {
        s.x -= scrollSpeed * s.z;
        if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
      }

      // Update asteroids
      for (const a of asteroids) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.y < a.r || a.y > H - a.r) a.vy *= -1;
      }
      // Cull
      for (let i = asteroids.length - 1; i >= 0; i--) {
        if (asteroids[i].x < -asteroids[i].r) asteroids.splice(i, 1);
      }

      // Spawn
      spawnCooldown--;
      if (spawnCooldown <= 0) {
        spawnAsteroid();
        spawnCooldown = Math.max(18, 50 - Math.floor(frame / 200));
      }

      // Difficulty ramp
      if (frame % 600 === 0) scrollSpeed += 0.4;

      // Score = frames survived / 6 ≈ ~10/sec at 60fps
      localScore = Math.floor(frame / 6);

      // Collision
      for (const a of asteroids) {
        const dx = a.x - rocketX;
        const dy = a.y - rocketY;
        if (dx * dx + dy * dy < (a.r + rocketSize - 4) ** 2) {
          localOver = true;
          stateRef.current.over = true;
          break;
        }
      }

      // Render
      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const s of stars) {
        ctx.fillStyle = `rgba(255,255,255,${s.z * 0.9})`;
        ctx.fillRect(s.x, s.y, 2, 2);
      }

      for (const a of asteroids) drawAsteroid(a);
      drawRocket(rocketX, rocketY);

      // HUD
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${localScore}`, 12, 26);

      // Update React state at low frequency to avoid re-renders flooding
      if (frame % 6 === 0) setScore(localScore);

      if (localOver) {
        setScore(localScore);
        setOver(true);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 32px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥 BOOM!', W / 2, H / 2 - 10);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '16px Inter, system-ui, sans-serif';
        ctx.fillText(`Score: ${localScore}`, W / 2, H / 2 + 20);
        return;
      }

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [resetKey]);

  return (
    <div className="board-wrap" ref={containerRef}>
      <div className="stats">
        <div className="stat"><label>Score</label><span>{score}</span></div>
        <div className="stat"><label>Status</label><span>{over ? 'Crashed' : 'Flying'}</span></div>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
      <div className="hint">
        <span className="kbd">↑</span> <span className="kbd">↓</span> or <span className="kbd">W</span>{' '}
        <span className="kbd">S</span> · Tap top/bottom on mobile · Dodge asteroids
      </div>
    </div>
  );
}
