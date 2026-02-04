/**
 * Safe Wallet Provider - Wraps wallet providers with error handling
 * Uses simple wagmi setup without AppKit to avoid dynamic import issues with Bun
 */

import { type ReactNode } from 'react'
import { WagmiContextProvider } from './WagmiContext'
import { WalletProvider } from './WalletContext'

interface SafeWalletProviderProps {
	children: ReactNode
}

export function SafeWalletProvider({ children }: SafeWalletProviderProps) {
	return (
		<WagmiContextProvider>
			<WalletProvider>
				{children}
			</WalletProvider>
		</WagmiContextProvider>
	)
}
