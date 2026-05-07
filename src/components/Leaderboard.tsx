import { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  useContractAddr,
  useRecentScores,
  useTopScores,
  useTotalScores,
} from '../hooks/useGameContract';
import type { ScoreEntry } from '../lib/contract';
import { Settings } from './Settings';
import type { GameId } from '../lib/games';
import { getGame } from '../lib/games';

type Tab = 'top' | 'recent' | 'settings';

function shortAddr(a: string) {
  return a.slice(0, 6) + '…' + a.slice(-4);
}
function timeAgo(ts: bigint) {
  const s = Math.floor(Date.now() / 1000 - Number(ts));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function Table({ rows, account }: { rows: readonly ScoreEntry[] | undefined; account?: string }) {
  if (!rows || rows.length === 0) {
    return <div className="empty">No scores yet — be the first!</div>;
  }
  return (
    <table className="lb-table">
      <thead>
        <tr><th>#</th><th>Player</th><th>Score</th><th>When</th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const me = account && r.player.toLowerCase() === account.toLowerCase();
          return (
            <tr key={`${r.player}-${i}-${r.timestamp}`} className={me ? 'me' : ''}>
              <td className="lb-rank">{i + 1}</td>
              <td className="addr">
                <a href={`https://sepolia.etherscan.io/address/${r.player}`} target="_blank" rel="noreferrer">
                  {shortAddr(r.player)}
                </a>
                {me && <b style={{ color: 'var(--accent2)' }}> (you)</b>}
              </td>
              <td><b>{r.score.toString()}</b></td>
              <td style={{ color: 'var(--muted)' }}>{timeAgo(r.timestamp)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type Props = { gameId: GameId };

export function Leaderboard({ gameId }: Props) {
  const [tab, setTab] = useState<Tab>('top');
  const { address } = useAccount();
  const contractAddr = useContractAddr();
  const game = getGame(gameId);

  const top = useTopScores(gameId, 20);
  const recent = useRecentScores(gameId, 20);
  const total = useTotalScores(gameId);

  return (
    <div className="card">
      <div className="lb-header">
        <span className="lb-game">{game.emoji} {game.name} leaderboard</span>
      </div>
      <div className="tabs">
        <div className={`tab ${tab === 'top' ? 'active' : ''}`} onClick={() => setTab('top')}>Top</div>
        <div className={`tab ${tab === 'recent' ? 'active' : ''}`} onClick={() => setTab('recent')}>Recent</div>
        <div className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</div>
      </div>

      {tab === 'top' && (
        <>
          {!contractAddr ? (
            <div className="empty">Set the contract address in <b>Settings</b>.</div>
          ) : (
            <Table rows={top.data as readonly ScoreEntry[] | undefined} account={address} />
          )}
          <div className="lb-footer">
            <span className="hint">
              {total.data !== undefined ? `Submissions for ${game.name}: ${(total.data as bigint).toString()}` : ''}
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => { top.refetch(); total.refetch(); }}>↻</button>
          </div>
        </>
      )}

      {tab === 'recent' && (
        <>
          {!contractAddr ? (
            <div className="empty">Set the contract address in <b>Settings</b>.</div>
          ) : (
            <Table rows={recent.data as readonly ScoreEntry[] | undefined} account={address} />
          )}
          <div className="lb-footer">
            <span />
            <button className="btn btn-outline btn-sm" onClick={() => recent.refetch()}>↻</button>
          </div>
        </>
      )}

      {tab === 'settings' && <Settings gameId={gameId} />}
    </div>
  );
}
