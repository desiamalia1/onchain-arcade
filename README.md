# Onchain Arcade — Sepolia

A Web3 mini-arcade with 4 games sharing a single on-chain leaderboard contract. Connect your wallet (MetaMask, Coinbase Wallet, WalletConnect, Rainbow, etc. — same modal experience as OpenSea), play, then submit your score to **Sepolia testnet**. Each submission pays a small `0.0001 ETH` fee forwarded to the contract deployer.

## 🎮 Games

| ID | Game | Theme | Controls |
|----|------|-------|----------|
| 0  | **2048** | Classic merge puzzle | Arrows / WASD / swipe |
| 1  | **Rocket Runner** 🚀 | Endless runner in deep space — dodge asteroids | ↑ ↓ / WS / tap top-bottom |
| 2  | **Snake** 🐍 | Eat food, grow longer, don't bite yourself | Arrows / swipe |
| 3  | **Flappy** 🐤 | Tap to flap, avoid pipes | Space / click / tap |

Each game has its **own per-game leaderboard** (top scores, recent submissions). Switching games preserves your wallet connection.

## Stack

- **Frontend:** Vite + React 18 + TypeScript
- **Web3:** wagmi v2 + viem + **RainbowKit** (the OpenSea-style multi-wallet modal)
- **Data:** TanStack Query (auto-refetch leaderboard)
- **Contract:** Solidity ^0.8.20 (`contracts/GameScores.sol`)
- **Network:** Sepolia (chainId `11155111`)
- **Deploy target:** Cloudflare Pages (also works on Vercel / Netlify)

## Project Layout

```
game-2048-web3/
├── contracts/
│   └── GameScores.sol         # smart contract
├── public/
│   ├── _redirects             # CF Pages SPA fallback
│   └── favicon.svg
├── src/
│   ├── components/            # Header, Game, Board, Leaderboard, Settings
│   ├── hooks/                 # use2048, useGameContract
│   ├── lib/                   # wagmi config, contract ABI, game logic
│   ├── App.tsx
│   ├── main.tsx               # providers (Wagmi, QueryClient, RainbowKit)
│   ├── styles.css
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 1. Local development

### Install
```bash
cd game-2048-web3
npm install
```

### Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
VITE_WC_PROJECT_ID=your_reown_project_id   # from https://cloud.reown.com (free)
VITE_CONTRACT_ADDRESS=                     # optional; can also set in-app via Settings
```
> Without a real `VITE_WC_PROJECT_ID`, WalletConnect-based wallets (mobile QR) won't work, but **MetaMask / Rabby / Brave Wallet / Coinbase Wallet extension** still will.

### Run
```bash
npm run dev
# open http://localhost:5173
```

---

## 2. Deploy the smart contract (Remix)

The contract uses OpenZeppelin v5 (`Ownable2Step`, `ReentrancyGuard`, `Pausable`). Remix auto-resolves `@openzeppelin/contracts/...` imports from npm.

1. Open <https://remix.ethereum.org>
2. Create `GameScores.sol`, paste contents from `contracts/GameScores.sol`
3. **Solidity Compiler** tab:
   - Version: `0.8.24` or later
   - Enable **optimization** (200 runs) — recommended for deploying to mainnet/L2 later
   - Click **Compile** (Remix auto-fetches OpenZeppelin packages)
4. **Deploy & Run Transactions** tab:
   - Environment: **Injected Provider — MetaMask**
   - MetaMask on **Sepolia** with test ETH ([Alchemy faucet](https://www.alchemy.com/faucets/ethereum-sepolia) · [Google faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))
   - Select contract: `GameScores`
   - Constructor args:
     - `initialOwner` — your admin wallet (can register games, change fees)
     - `initialReceiver` — wallet that receives withdrawn fees (often same as owner)
   - Click **Deploy** → confirm in MetaMask
5. Copy the deployed contract address.

### Verify the contract on Etherscan (recommended)

After deploying, verify so the public can read source + interact via Etherscan UI:

**Option A — Remix one-click:**
- In Remix, install the **"Etherscan Contract Verifier"** plugin
- Get a free API key at <https://etherscan.io/myapikey>
- Plugin → enter API key + contract address → **Verify**

**Option B — Hardhat verify (if you migrate later):**
```bash
npx hardhat verify --network sepolia 0xYourAddress 0xOwner 0xReceiver
```

Once verified, anyone can read your contract code on Sepolia Etherscan and call admin/view functions through the **Read/Write Contract** tabs there.

In the running app: open **Settings** tab → paste address → **Save**. The page reloads and the leaderboard becomes active.

---

## 3. Push to GitHub

```bash
cd game-2048-web3
git init
git add .
git commit -m "feat: initial 2048 onchain web app"

# create empty repo on github.com first, then:
git branch -M main
git remote add origin https://github.com/<your-user>/game-2048-web3.git
git push -u origin main
```

> `.env` is gitignored — your secrets won't be pushed. Only `.env.example` is committed.

---

## 4. Deploy to Cloudflare Pages

### Option A — via Cloudflare Dashboard (easiest)

1. Sign in to <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorize Cloudflare on GitHub, select the `game-2048-web3` repo
3. Build configuration:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (default)
   - **Node version:** add env var `NODE_VERSION` = `20`
4. **Environment variables** (Production + Preview):
   - `VITE_WC_PROJECT_ID` = your projectId from cloud.reown.com
   - `VITE_CONTRACT_ADDRESS` = (optional) your deployed contract address
5. **Save and Deploy**

Cloudflare will auto-redeploy on every `git push` to `main`. Custom domains can be added under **Custom domains** tab.

### Option B — via Wrangler CLI

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages deploy dist --project-name=game-2048-web3
```

> The `public/_redirects` file handles SPA fallback so direct URLs work after refresh.

---

## 5. Anti-cheat note

Currently in **trust mode**: the frontend submits whatever score the user has. Open devtools → call `submit(99999999)` and it works. That's fine for testnet. For production:

- **Signed scores (recommended):** small Node API signs `(player, score, nonce)` with a server key; contract verifies via `ecrecover`. Forgery becomes impossible without the server key. Cloudflare Workers is a good fit for this.
- **On-chain logic:** make the game itself run on-chain (very expensive for non-trivial games).

When you're ready, ask me to add the signed-score variant — it's a contract upgrade + a Worker endpoint.

---

## Contract API

Initial registered games (gameId): `0=2048`, `1=Rocket Runner`, `2=Snake`, `3=Flappy`. Owner can register more anytime via `registerGame()`.

### Player

```solidity
function submitScore(uint256 gameId, uint256 score) external payable;     // pays >= feeFor(gameId)
function feeFor(uint256 gameId) view returns (uint256);
function totalScores(uint256 gameId) view returns (uint256);
function bestScore(uint256 gameId, address) view returns (uint256);
function submissionCount(uint256 gameId, address) view returns (uint256);
function lastSubmission(uint256 gameId, address) view returns (uint256);
function getTopScores(uint256 gameId, uint256 n) view returns (Entry[]);
function getRecentScores(uint256 gameId, uint256 n) view returns (Entry[]);
function getGame(uint256 gameId) view returns (Game);
function getAllGames() view returns (Game[]);
```

### Anyone (push fees)

```solidity
function withdrawFees() external returns (uint256);   // pushes pendingFees to feeReceiver
function pendingFees() view returns (uint256);
```

### Owner only

```solidity
function registerGame(string name, uint256 maxScore, uint256 fee, uint256 cooldown)
    external returns (uint256 gameId);
function updateGame(uint256 gameId, bool enabled, uint256 maxScore, uint256 fee, uint256 cooldown)
    external;
function setDefaultFee(uint256 newFee) external;
function setFeeReceiver(address newReceiver) external;
function pause() external;
function unpause() external;
// Inherited from Ownable2Step:
function transferOwnership(address newOwner) external;
function acceptOwnership() external;     // 2-step: pending owner must accept
```

### Per-game config explained

| Field | Effect | `0` means |
|-------|--------|-----------|
| `enabled` | If false, `submitScore` reverts with `GameDisabled` | n/a |
| `maxScore` | Caps submitted score (basic anti-cheat ceiling) | no cap |
| `submissionFee` | Per-game fee in wei | use `defaultFee` |
| `cooldown` | Min seconds between submissions per address | no cooldown |

### Adding a new game (no redeploy needed!)

After your contract is deployed and verified:

1. Add a 5th component, e.g. `src/components/games/Tetris.tsx`
2. Append to `GAMES` in `src/lib/games.ts` with `id: 4`
3. Update the `switch` in `src/App.tsx` to render `<Tetris />`
4. As contract owner: call `registerGame("Tetris", 0, 0, 0)` (via Etherscan **Write Contract** tab once verified, or via Remix). Returns `gameId = 4`.
5. Push frontend update → Cloudflare auto-redeploys.

The on-chain leaderboard for the new game starts empty. All previous game scores are unaffected.

> **Note:** the contract was upgraded in this version (multi-game + secure base). If you deployed an earlier version, redeploy and update the contract address in the **Settings** tab.

---

## Scaling ideas

- **Multiple games** — extract `Game` interface, add Snake / Tetris / Flappy as separate routes
- **Per-game leaderboards** — one contract per game, or one contract with `gameId` field
- **Weekly tournaments** — contract holds a portion of fees as prize pool, top scorer claims
- **Indexer (The Graph / Ponder)** — for fast/rich leaderboard queries when you have many submissions
- **Mainnet / L2** — switch chain in `src/lib/wagmi.ts` (Base, Arbitrum, Optimism are cheap and popular)

---

## Troubleshooting

- **"Set the contract address in Settings"** → deploy the contract first, then paste address in app
- **Submit fails "Insufficient fee"** → wallet sent less than `submissionFee` (frontend reads it automatically; rare unless contract was misconfigured)
- **Leaderboard empty after submit** → click ↻ Refresh; RPC indexing can lag a few seconds
- **CF Pages build fails on Node version** → add `NODE_VERSION=20` env var in CF Pages settings
- **WalletConnect modal blank** → missing/invalid `VITE_WC_PROJECT_ID`. Free at https://cloud.reown.com
