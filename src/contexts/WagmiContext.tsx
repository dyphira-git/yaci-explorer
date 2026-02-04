/**
 * Wagmi Context - Simple EVM wallet connection without AppKit
 * Uses only the injected connector (MetaMask, etc.) to avoid dynamic import issues
 */

import { createConfig, http, WagmiProvider } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

// Create wagmi config with only injected connector (no dynamic imports)
export const wagmiConfig = createConfig({
	chains: [republicChain],
	connectors: [
		injected({
			shimDisconnect: true,
		}),
	],
	transports: {
		[republicChain.id]: http(REPUBLIC_CHAIN_CONFIG.endpoints.evmRpc),
	},
})

// Query client for wagmi
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			gcTime: 1000 * 60 * 5,
		},
	},
})

interface WagmiContextProviderProps {
	children: ReactNode
}

export function WagmiContextProvider({ children }: WagmiContextProviderProps) {
	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		</WagmiProvider>
	)
}
