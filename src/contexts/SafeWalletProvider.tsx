/**
 * Safe Wallet Provider - Wraps wallet context with error handling
 * Uses direct EIP-1193 provider access instead of wagmi for Bun compatibility
 */

import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider } from './WalletContext'

interface SafeWalletProviderProps {
	children: ReactNode
}

// Query client for React Query (used by other parts of the app)
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			gcTime: 1000 * 60 * 5,
		},
	},
})

export function SafeWalletProvider({ children }: SafeWalletProviderProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<WalletProvider>
				{children}
			</WalletProvider>
		</QueryClientProvider>
	)
}
