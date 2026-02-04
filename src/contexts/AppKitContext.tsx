/**
 * AppKit Context - EVM wallet connection via Reown AppKit + Wagmi
 */

import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { type ReactNode } from 'react'
import { REPUBLIC_CHAIN_CONFIG } from '@/lib/chain-config'

// Define Republic chain for wagmi/viem
const republicChain = {
	id: REPUBLIC_CHAIN_CONFIG.chainId,
	name: REPUBLIC_CHAIN_CONFIG.chainName,
	nativeCurrency: REPUBLIC_CHAIN_CONFIG.nativeCurrency,
	rpcUrls: {
		default: {
			http: [REPUBLIC_CHAIN_CONFIG.endpoints.evmRpc],
		},
	},
	blockExplorers: {
		default: {
			name: 'Republic Explorer',
			url: 'https://explorer.republicai.io',
		},
	},
	testnet: true,
} as const

// Project ID from Reown Cloud (WalletConnect)
// Shared with republic-points-webapp
const projectId = '477a766532bfe146a286dfb2fade53ff'

// Metadata for wallet connection
const metadata = {
	name: 'Republic Explorer',
	description: 'Block explorer for Republic AI network',
	url: typeof window !== 'undefined' ? window.location.origin : 'https://explorer.republicai.io',
	icons: ['https://explorer.republicai.io/favicon.ico'],
}

// Create wagmi adapter with Republic chain
const wagmiAdapter = new WagmiAdapter({
	networks: [republicChain],
	projectId,
})

// Create AppKit instance
createAppKit({
	adapters: [wagmiAdapter],
	networks: [republicChain],
	defaultNetwork: republicChain,
	projectId,
	metadata,
	features: {
		analytics: false,
		email: false,
		socials: false,
		swaps: false,
		onramp: false,
	},
	themeMode: 'dark',
	themeVariables: {
		'--w3m-accent': '#22c55e', // Republic green
		'--w3m-border-radius-master': '8px',
	},
})

// Query client for wagmi
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60, // 1 minute
			gcTime: 1000 * 60 * 5, // 5 minutes
		},
	},
})

interface AppKitProviderProps {
	children: ReactNode
}

export function AppKitProvider({ children }: AppKitProviderProps) {
	return (
		<WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		</WagmiProvider>
	)
}

// Re-export hooks for convenience
export { useAppKit, useAppKitState } from '@reown/appkit/react'
