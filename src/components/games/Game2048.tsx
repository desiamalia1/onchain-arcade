import { useEffect } from 'react';
import { use2048 } from '../../hooks/use2048';
import { Board } from '../Board';

type Props = {
  resetKey: number;
  onScore: (score: number, gameOver: boolean) => void;
};

export function Game2048({ resetKey, onScore }: Props) {
  const game = use2048();

  // Reset when parent toggles resetKey
  useEffect(() => {
    if (resetKey > 0) game.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Bubble score up
  useEffect(() => {
    onScore(game.score, game.over);
  }, [game.score, game.over, onScore]);

  return (
    <div className="board-wrap">
      <div className="stats">
        <div className="stat"><label>Score</label><span>{game.score}</span></div>
        <div className="stat"><label>Best (local)</label><span>{game.bestLocal}</span></div>
        <div className="stat"><label>Moves</label><span>{game.moves}</span></div>
      </div>
      <Board grid={game.grid} onMove={game.move} />
      {game.over && <div className="gameover show">Game Over — final score: {game.score}</div>}
      {game.won && !game.over && (
        <div className="gameover won show">🎉 You hit 2048! Keep going for a higher score.</div>
      )}
      <div className="hint">
        Move: <span className="kbd">↑</span> <span className="kbd">↓</span> <span className="kbd">←</span>{' '}
        <span className="kbd">→</span> or <span className="kbd">W</span> <span className="kbd">A</span>{' '}
        <span className="kbd">S</span> <span className="kbd">D</span> · Swipe on mobile
      </div>
    </div>
  );
}
