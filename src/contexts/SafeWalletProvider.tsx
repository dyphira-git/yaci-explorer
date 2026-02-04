/**
 * Safe Wallet Provider - Wraps wallet providers with error handling
 * If wallet SDK fails to load (due to bundler issues), the app still works
 */

import { type ReactNode, useState, useEffect } from 'react'

interface SafeWalletProviderProps {
	children: ReactNode
}

export function SafeWalletProvider({ children }: SafeWalletProviderProps) {
	const [WalletProviders, setWalletProviders] = useState<React.ComponentType<{ children: ReactNode }> | null>(null)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		// Dynamically import wallet providers to catch any loading errors
		Promise.all([
			import('./AppKitContext'),
			import('./WalletContext'),
		])
			.then(([appKit, wallet]) => {
				// Create a combined provider component
				const Combined = ({ children }: { children: ReactNode }) => (
					<appKit.AppKitProvider>
						<wallet.WalletProvider>
							{children}
						</wallet.WalletProvider>
					</appKit.AppKitProvider>
				)
				setWalletProviders(() => Combined)
			})
			.catch((err) => {
				console.warn('Wallet providers failed to load, wallet features disabled:', err.message)
				setError(err)
			})
	}, [])

	// If wallet providers failed to load, render children without them
	if (error || WalletProviders === null) {
		return <>{children}</>
	}

	return <WalletProviders>{children}</WalletProviders>
}
