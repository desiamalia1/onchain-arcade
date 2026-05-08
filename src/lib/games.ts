export type GameId = 0 | 1 | 2 | 3 | 4;

export type GameMeta = {
  id: GameId;
  slug: string;
  name: string;
  emoji: string;
  blurb: string;
};

export const GAMES: readonly GameMeta[] = [
  { id: 0, slug: '2048', name: '2048', emoji: '🔢', blurb: 'Slide tiles, merge pairs, reach 2048.' },
  { id: 1, slug: 'runner', name: 'Rocket Runner', emoji: '🚀', blurb: 'Dodge asteroids in deep space.' },
  { id: 2, slug: 'snake', name: 'Snake', emoji: '🐍', blurb: 'Eat food, grow longer, avoid yourself.' },
  { id: 3, slug: 'flappy', name: 'Flappy', emoji: '🐤', blurb: 'Tap to flap. Don\'t hit the pipes.' },
  { id: 4, slug: 'memory', name: 'Memory', emoji: '🧠', blurb: 'Flip cards, find matching pairs.' },
] as const;

export function getGame(id: GameId): GameMeta {
  return GAMES.find((g) => g.id === id)!;
}
