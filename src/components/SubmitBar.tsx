import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import {
  useContractAddr,
  useSubmitScore,
} from '../hooks/useGameContract';
import type { GameId } from '../lib/games';

type Props = {
  gameId: GameId;
  score: number;
  gameOver: boolean;
  onReset: () => void;
};

export function SubmitBar({ gameId, score, gameOver, onReset }: Props) {
  const { isConnected } = useAccount();
  const contractAddr = useContractAddr();
  const submit = useSubmitScore(gameId);

  const lastSubmitted = useRef<string>('');
  useEffect(() => {
    if (score === 0) lastSubmitted.current = '';
  }, [score]);

  const submitKey = `${gameId}:${score}`;
  const alreadySubmitted = lastSubmitted.current === submitKey && submit.isConfirmed;

  const canSubmit =
    isConnected &&
    !!contractAddr &&
    score > 0 &&
    !alreadySubmitted &&
    !submit.isPending &&
    !submit.isConfirming;

  const handleSubmit = async () => {
    lastSubmitted.current = submitKey;
    await submit.submit(score);
  };

  let submitLabel = `Submit Score (${score})`;
  if (submit.fee !== undefined) submitLabel += ` · ${formatEther(submit.fee)} ETH`;
  if (submit.isPending) submitLabel = 'Confirm in wallet…';
  if (submit.isConfirming) submitLabel = 'Confirming on-chain…';
  if (alreadySubmitted) submitLabel = '✓ Submitted';

  return (
    <div className="submit-bar">
      <div className="submit-row">
        <button className="btn btn-outline btn-sm" onClick={onReset}>↻ New Game</button>
        <button
          className="btn btn-success"
          disabled={!canSubmit}
          onClick={handleSubmit}
          title={
            !isConnected ? 'Connect wallet first' :
            !contractAddr ? 'Set contract address in Settings' :
            score === 0 ? 'Play to score points' :
            gameOver ? 'Submit your final score' : 'Submit current score'
          }
        >
          {submitLabel}
        </button>
      </div>
      {submit.error && <div className="error-text">⚠ {submit.error}</div>}
      {submit.receiptError && <div className="error-text">⚠ {submit.receiptError}</div>}
      {submit.hash && (
        <div className="hint">
          TX:{' '}
          <a href={`https://sepolia.etherscan.io/tx/${submit.hash}`} target="_blank" rel="noreferrer">
            {submit.hash.slice(0, 14)}…
          </a>
        </div>
      )}
    </div>
  );
}
