import { GAMES, type GameId } from '../lib/games';

type Props = {
  active: GameId;
  onChange: (id: GameId) => void;
};

export function GameTabs({ active, onChange }: Props) {
  return (
    <div className="game-tabs">
      {GAMES.map((g) => (
        <button
          key={g.id}
          className={`game-tab ${active === g.id ? 'active' : ''}`}
          onClick={() => onChange(g.id)}
          title={g.blurb}
        >
          <span className="game-tab-emoji">{g.emoji}</span>
          <span className="game-tab-name">{g.name}</span>
        </button>
      ))}
    </div>
  );
}
