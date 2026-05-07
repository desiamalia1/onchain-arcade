import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

// Get a free projectId at https://cloud.reown.com (formerly WalletConnect Cloud).
// Without a real projectId, WalletConnect-based wallets won't work but injected
// wallets (MetaMask, Rabby, Brave) still will.
const projectId = import.meta.env.VITE_WC_PROJECT_ID || 'demo-project-id';

export const wagmiConfig = getDefaultConfig({
  appName: '2048 Onchain',
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  ssr: false,
});

export const SEPOLIA_CHAIN_ID = sepolia.id;
