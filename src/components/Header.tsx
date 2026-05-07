import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header>
      <div>
        <h1>🎮 2048 Onchain</h1>
        <div className="sub">Play · Submit score on Sepolia · Climb the leaderboard</div>
      </div>
      <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
    </header>
  );
}
