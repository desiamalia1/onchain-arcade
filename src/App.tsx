import { useCallback, useState } from 'react';
import { Header } from './components/Header';
import { GameTabs } from './components/GameTabs';
import { Leaderboard } from './components/Leaderboard';
import { SubmitBar } from './components/SubmitBar';
import { Game2048 } from './components/games/Game2048';
import { Runner } from './components/games/Runner';
import { Snake } from './components/games/Snake';
import { Flappy } from './components/games/Flappy';
import { Memory } from './components/games/Memory';
import { getGame, type GameId } from './lib/games';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameId>(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleScoreChange = useCallback((s: number, over: boolean) => {
    setScore(s);
    if (over) setGameOver(true);
  }, []);

  const handleSwitch = (id: GameId) => {
    if (id === activeGame) return;
    setActiveGame(id);
    setScore(0);
    setGameOver(false);
    setResetKey(0);
  };

  const handleReset = () => {
    setScore(0);
    setGameOver(false);
    setResetKey((k) => k + 1);
  };

  const meta = getGame(activeGame);

  const renderGame = () => {
    const props = { resetKey, onScore: handleScoreChange };
    switch (activeGame) {
      case 0: return <Game2048 key={`g0-${resetKey}`} {...props} />;
      case 1: return <Runner key={`g1-${resetKey}`} {...props} />;
      case 2: return <Snake key={`g2-${resetKey}`} {...props} />;
      case 3: return <Flappy key={`g3-${resetKey}`} {...props} />;
      case 4: return <Memory key={`g4-${resetKey}`} {...props} />;
    }
  };

  return (
    <div className="container">
      <Header />
      <GameTabs active={activeGame} onChange={handleSwitch} />

      <div className="grid">
        <div className="card">
          <div className="card-title">
            <span className="card-emoji">{meta.emoji}</span>
            <div>
              <h2 style={{ margin: 0 }}>{meta.name}</h2>
              <div className="card-blurb">{meta.blurb}</div>
            </div>
          </div>
          {renderGame()}
          <SubmitBar
            gameId={activeGame}
            score={score}
            gameOver={gameOver}
            onReset={handleReset}
          />
        </div>

        <Leaderboard gameId={activeGame} />
      </div>

      <footer className="footer">
        <span>Multi-game on-chain leaderboard · Sepolia · </span>
        <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </div>
  );
}
