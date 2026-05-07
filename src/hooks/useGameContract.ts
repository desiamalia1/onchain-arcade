import { useCallback, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import { GAME_SCORES_ABI, getContractAddress, type OnchainGame, type ScoreEntry } from '../lib/contract';
import type { GameId } from '../lib/games';

export function useContractAddr(): Address | undefined {
  return getContractAddress();
}

/// Per-game fee (uses defaultFee if game has no override).
export function useGameFee(gameId: GameId) {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'feeFor',
    args: [BigInt(gameId)],
    query: { enabled: !!address },
  });
}

export function useDefaultFee() {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'defaultFee',
    query: { enabled: !!address },
  });
}

export function useFeeReceiver() {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'feeReceiver',
    query: { enabled: !!address },
  });
}

export function useOwner() {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'owner',
    query: { enabled: !!address },
  });
}

export function usePaused() {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'paused',
    query: { enabled: !!address, refetchInterval: 30_000 },
  });
}

export function useTotalScores(gameId: GameId) {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'totalScores',
    args: [BigInt(gameId)],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
}

export function useGameMeta(gameId: GameId) {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'getGame',
    args: [BigInt(gameId)],
    query: { enabled: !!address },
  }) as ReturnType<typeof useReadContract> & { data?: OnchainGame };
}

export function useAllGames() {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'getAllGames',
    query: { enabled: !!address, refetchInterval: 60_000 },
  }) as ReturnType<typeof useReadContract> & { data?: readonly OnchainGame[] };
}

export function useMyStats(gameId: GameId) {
  const { address: account } = useAccount();
  const address = useContractAddr();
  const best = useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'bestScore',
    args: account ? [BigInt(gameId), account] : undefined,
    query: { enabled: !!address && !!account },
  });
  const count = useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'submissionCount',
    args: account ? [BigInt(gameId), account] : undefined,
    query: { enabled: !!address && !!account },
  });
  const last = useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'lastSubmission',
    args: account ? [BigInt(gameId), account] : undefined,
    query: { enabled: !!address && !!account },
  });
  return { best, count, last };
}

export function useTopScores(gameId: GameId, n = 20) {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'getTopScores',
    args: [BigInt(gameId), BigInt(n)],
    query: { enabled: !!address, refetchInterval: 20_000 },
  }) as ReturnType<typeof useReadContract> & { data?: readonly ScoreEntry[] };
}

export function useRecentScores(gameId: GameId, n = 20) {
  const address = useContractAddr();
  return useReadContract({
    address,
    abi: GAME_SCORES_ABI,
    functionName: 'getRecentScores',
    args: [BigInt(gameId), BigInt(n)],
    query: { enabled: !!address, refetchInterval: 15_000 },
  }) as ReturnType<typeof useReadContract> & { data?: readonly ScoreEntry[] };
}

export function useSubmitScore(gameId: GameId) {
  const address = useContractAddr();
  const { data: fee } = useGameFee(gameId);
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (score: number) => {
      setError(null);
      if (!address) {
        setError('No contract address configured.');
        return;
      }
      if (fee === undefined) {
        setError('Fee not loaded yet — try again in a moment.');
        return;
      }
      if (score <= 0) {
        setError('Score must be > 0.');
        return;
      }
      try {
        await writeContractAsync({
          address,
          abi: GAME_SCORES_ABI,
          functionName: 'submitScore',
          args: [BigInt(gameId), BigInt(score)],
          value: fee as bigint,
        });
      } catch (e: unknown) {
        const err = e as { shortMessage?: string; message?: string };
        setError(err.shortMessage || err.message || 'Submit failed');
      }
    },
    [address, fee, gameId, writeContractAsync],
  );

  return {
    submit,
    reset,
    fee: fee as bigint | undefined,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error,
    receiptError: receipt.error?.message,
  };
}
