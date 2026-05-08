import { useCallback, useEffect, useRef, useState } from 'react';

const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const CARD_W = 80;
const CARD_H = 100;
const GAP = 8;
const PAD = 16;
const W = COLS * CARD_W + (COLS - 1) * GAP + PAD * 2;
const H = ROWS * CARD_H + (ROWS - 1) * GAP + PAD * 2 + 40;
const FLIP_BACK_MS = 800;

type Card = {
  value: number;
  flipped: boolean;
  matched: boolean;
};

type Props = {
  resetKey: number;
  onScore: (score: number, gameOver: boolean) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(): Card[] {
  const values: number[] = [];
  for (let v = 1; v <= TOTAL / 2; v++) {
    values.push(v, v);
  }
  return shuffle(values).map((v) => ({ value: v, flipped: false, matched: false }));
}

export function Memory({ resetKey, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardsRef = useRef<Card[]>(buildCards());
  const selectedRef = useRef<number[]>([]);
  const lockedRef = useRef(false);
  const movesRef = useRef(0);
  const matchedRef = useRef(0);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const [, setTick] = useState(0);

  const forceRender = () => setTick((t) => t + 1);

  useEffect(() => {
    cardsRef.current = buildCards();
    selectedRef.current = [];
    lockedRef.current = false;
    movesRef.current = 0;
    matchedRef.current = 0;
    scoreRef.current = 0;
    gameOverRef.current = false;
    forceRender();
  }, [resetKey]);

  const calcScore = () => {
    const m = matchedRef.current;
    const mv = movesRef.current;
    return Math.max(0, m * 100 - mv * 2);
  };

  const checkWin = useCallback(() => {
    if (matchedRef.current === TOTAL / 2) {
      gameOverRef.current = true;
      const s = calcScore();
      scoreRef.current = s;
      onScore(s, true);
      forceRender();
    }
  }, [onScore]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);
    const cards = cardsRef.current;
    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = PAD + col * (CARD_W + GAP);
      const y = PAD + row * (CARD_H + GAP);
      const card = cards[i];
      ctx.beginPath();
      ctx.roundRect(x, y, CARD_W, CARD_H, 8);
      if (card.matched) {
        ctx.fillStyle = '#1a3a1a'; ctx.fill();
        ctx.strokeStyle = '#2d5a2d'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#4a8a4a'; ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(card.value), x + CARD_W / 2, y + CARD_H / 2);
      } else if (card.flipped) {
        ctx.fillStyle = '#1a1a3a'; ctx.fill();
        ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#a5b4fc'; ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(card.value), x + CARD_W / 2, y + CARD_H / 2);
      } else {
        ctx.fillStyle = '#1e1e30'; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#555'; ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', x + CARD_W / 2, y + CARD_H / 2);
      }
    }
    const s = gameOverRef.current ? scoreRef.current : calcScore();
    ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`Pairs: ${matchedRef.current}/${TOTAL / 2}  Moves: ${movesRef.current}  Score: ${s}`, PAD, H - 12);
    if (gameOverRef.current) {
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'right';
      ctx.fillText('ALL MATCHED!', W - PAD, H - 12);
    }
  }, [onScore]);

  useEffect(() => { draw(); }, [draw, tick]);

  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (gameOverRef.current || lockedRef.current) return;
      const c = canvasRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      let cx: number, cy: number;
      if ('touches' in e) {
        if (e.touches.length === 0) return;
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      const mx = (cx - rect.left) * scaleX;
      const my = (cy - rect.top) * scaleY;
      const cards = cardsRef.current;
      for (let i = 0; i < TOTAL; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = PAD + col * (CARD_W + GAP);
        const y = PAD + row * (CARD_H + GAP);
        if (mx >= x && mx <= x + CARD_W && my >= y && my <= y + CARD_H) {
          const card = cards[i];
          if (card.matched || card.flipped) return;
          card.flipped = true;
          selectedRef.current.push(i);
          if (selectedRef.current.length === 2) {
            movesRef.current += 1;
            const [a, b] = selectedRef.current;
            if (cards[a].value === cards[b].value) {
              cards[a].matched = true;
              cards[b].matched = true;
              matchedRef.current += 1;
              selectedRef.current = [];
              const s = calcScore();
              scoreRef.current = s;
              onScore(s, false);
              forceRender();
              checkWin();
            } else {
              lockedRef.current = true;
              forceRender();
              setTimeout(() => {
                cards[a].flipped = false;
                cards[b].flipped = false;
                selectedRef.current = [];
                lockedRef.current = false;
                forceRender();
              }, FLIP_BACK_MS);
            }
          } else {
            forceRender();
          }
          return;
        }
      }
    },
    [onScore, checkWin],
  );

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={W}
      height={H}
      style={{ width: 'min(420px, 90vw)', height: 'auto', aspectRatio: `${W}/${H}` }}
      onClick={handleClick}
      onTouchStart={handleClick}
    />
  );
}
