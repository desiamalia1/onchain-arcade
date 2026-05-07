import type { Address } from 'viem';

/// ABI for GameScores (secure + extensible). Keep in sync with `contracts/GameScores.sol`.
export const GAME_SCORES_ABI = [
  // ---- views ----
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'feeReceiver', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'defaultFee', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'pendingFees', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'nextGameId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },

  {
    type: 'function',
    name: 'feeFor',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalScores',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'bestScore',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'submissionCount',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'lastSubmission',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getGame',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'enabled', type: 'bool' },
          { name: 'maxScore', type: 'uint256' },
          { name: 'submissionFee', type: 'uint256' },
          { name: 'cooldown', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getAllGames',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'name', type: 'string' },
          { name: 'enabled', type: 'bool' },
          { name: 'maxScore', type: 'uint256' },
          { name: 'submissionFee', type: 'uint256' },
          { name: 'cooldown', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getRecentScores',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'uint256' }],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'player', type: 'address' },
          { name: 'score', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getTopScores',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }, { type: 'uint256' }],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'player', type: 'address' },
          { name: 'score', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },

  // ---- mutating ----
  {
    type: 'function',
    name: 'submitScore',
    stateMutability: 'payable',
    inputs: [
      { name: 'gameId', type: 'uint256' },
      { name: 'score', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawFees',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },

  // ---- admin (for completeness; UI may not call directly) ----
  {
    type: 'function',
    name: 'registerGame',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'maxScore', type: 'uint256' },
      { name: 'submissionFee', type: 'uint256' },
      { name: 'cooldown', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'updateGame',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256' },
      { type: 'bool' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setDefaultFee',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setFeeReceiver',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }],
    outputs: [],
  },
  { type: 'function', name: 'pause', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'unpause', stateMutability: 'nonpayable', inputs: [], outputs: [] },

  // ---- events ----
  {
    type: 'event',
    name: 'ScoreSubmitted',
    inputs: [
      { name: 'gameId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
      { name: 'entryId', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GameRegistered',
    inputs: [
      { name: 'gameId', type: 'uint256', indexed: true },
      { name: 'name', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FeesWithdrawn',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

const STORAGE_KEY = 'g2048_contract_addr';

export function getContractAddress(): Address | undefined {
  const fromEnv = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;
  const fromLs = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const v = (fromLs && fromLs.trim()) || (fromEnv && fromEnv.trim()) || '';
  if (!v) return undefined;
  return v as Address;
}

export function setContractAddress(addr: string) {
  if (!addr) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, addr);
}

export type ScoreEntry = {
  player: Address;
  score: bigint;
  timestamp: bigint;
};

export type OnchainGame = {
  name: string;
  enabled: boolean;
  maxScore: bigint;
  submissionFee: bigint;
  cooldown: bigint;
};
