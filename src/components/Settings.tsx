import { useState } from 'react';
import { isAddress, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import {
  getContractAddress,
  setContractAddress,
} from '../lib/contract';
import {
  useFeeReceiver,
  useGameFee,
  useGameMeta,
  useMyStats,
  useOwner,
  usePaused,
  useTotalScores,
} from '../hooks/useGameContract';
import type { GameId } from '../lib/games';
import { getGame } from '../lib/games';

type Props = { gameId: GameId };

export function Settings({ gameId }: Props) {
  const [value, setValue] = useState<string>(getContractAddress() || '');
  const [msg, setMsg] = useState<string>('');
  const { address: account } = useAccount();
  const game = getGame(gameId);

  const fee = useGameFee(gameId);
  const onchainMeta = useGameMeta(gameId);
  const owner = useOwner();
  const receiver = useFeeReceiver();
  const paused = usePaused();
  const total = useTotalScores(gameId);
  const myStats = useMyStats(gameId);

  const save = () => {
    const v = value.trim();
    if (v && !isAddress(v)) {
      setMsg('❌ Invalid address');
      return;
    }
    setContractAddress(v);
    setMsg('✓ Saved. Reloading…');
    setTimeout(() => location.reload(), 400);
  };

  const current = getContractAddress();

  return (
    <div>
      <div className="form-group">
        <label>Contract Address (Sepolia)</label>
        <div className="input-row">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0x... (deploy GameScores.sol via Remix first)"
          />
          <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
        </div>
        {msg && <div className="hint">{msg}</div>}
      </div>

      <div className="hint">
        Network: <b>Sepolia (11155111)</b> · Showing stats for <b>{game.emoji} {game.name}</b><br />
        Need test ETH? <a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noreferrer">Alchemy faucet</a>{' '}·{' '}
        <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer">Google faucet</a>
      </div>

      {current && (
        <div className="contract-info">
          <div>
            Address:{' '}
            <a href={`https://sepolia.etherscan.io/address/${current}`} target="_blank" rel="noreferrer">
              {current}
            </a>
          </div>
          {paused.data === true && (
            <div style={{ color: 'var(--yellow)' }}>⚠ Contract is currently <b>paused</b> — submissions disabled.</div>
          )}
          {owner.data ? <div>Owner (admin): <span className="mono">{String(owner.data)}</span></div> : null}
          {receiver.data ? <div>Fee receiver: <span className="mono">{String(receiver.data)}</span></div> : null}
          {fee.data !== undefined && <div>Fee for {game.name}: <b>{formatEther(fee.data as bigint)} ETH</b></div>}
          {onchainMeta.data && (
            <div>
              On-chain: name <b>{onchainMeta.data.name}</b>, enabled <b>{String(onchainMeta.data.enabled)}</b>
              {onchainMeta.data.maxScore > 0n && <>, maxScore <b>{onchainMeta.data.maxScore.toString()}</b></>}
              {onchainMeta.data.cooldown > 0n && <>, cooldown <b>{onchainMeta.data.cooldown.toString()}s</b></>}
            </div>
          )}
          {total.data !== undefined && (
            <div>
              {game.name} submissions: <b>{(total.data as bigint).toString()}</b>
            </div>
          )}
          {account && myStats.best.data !== undefined && (
            <div>
              Your best in {game.name}: <b>{(myStats.best.data as bigint).toString()}</b>
              {' · '}submissions: <b>{(myStats.count.data as bigint | undefined)?.toString() ?? '0'}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
