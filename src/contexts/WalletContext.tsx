/**
 * Wallet Context - Unified wallet state management for both Keplr (Cosmos) and EVM wallets
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi'
import { evmToCosmosAddress, cosmosToEvmAddress, isEvmAddress } from '@/lib/address'
import { REPUBLIC_CHAIN_CONFIG } from '@/lib/chain-config'

// Types
export type WalletType = 'keplr' | 'evm' | null

interface WalletState {
	// Connection state
	isConnected: boolean
	isConnecting: boolean
	walletType: WalletType

	// Addresses (both formats for the same account)
	evmAddress: string | null
	cosmosAddress: string | null

	// Error state
	error: string | null
}

interface WalletContextValue extends WalletState {
	// Connection methods
	connectKeplr: () => Promise<void>
	connectEvm: () => void
	disconnect: () => void

	// Utility
	getDisplayAddress: () => string | null
}

const WalletContext = createContext<WalletContextValue | null>(null)

// Keplr window type
declare global {
	interface Window {
		keplr?: {
			enable: (chainId: string) => Promise<void>
			experimentalSuggestChain: (chainInfo: unknown) => Promise<void>
			getOfflineSigner: (chainId: string) => unknown
			getKey: (chainId: string) => Promise<{
				name: string
				algo: string
				pubKey: Uint8Array
				address: Uint8Array
				bech32Address: string
				isNanoLedger: boolean
			}>
		}
	}
}

export function WalletProvider({ children }: { children: ReactNode }) {
	const [walletType, setWalletType] = useState<WalletType>(null)
	const [keplrAddress, setKeplrAddress] = useState<string | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Wagmi hooks for EVM wallet
	const { address: evmWagmiAddress, isConnected: isEvmConnected } = useAccount()
	const { disconnect: disconnectWagmi } = useDisconnect()
	const { data: walletClient } = useWalletClient()

	// Derive addresses based on wallet type
	const evmAddress = walletType === 'evm' && evmWagmiAddress
		? evmWagmiAddress
		: walletType === 'keplr' && keplrAddress
			? cosmosToEvmAddress(keplrAddress)
			: null

	const cosmosAddress = walletType === 'keplr' && keplrAddress
		? keplrAddress
		: walletType === 'evm' && evmWagmiAddress
			? evmToCosmosAddress(evmWagmiAddress)
			: null

	const isConnected = walletType !== null && (
		(walletType === 'keplr' && keplrAddress !== null) ||
		(walletType === 'evm' && isEvmConnected)
	)

	// Connect to Keplr
	const connectKeplr = useCallback(async () => {
		setIsConnecting(true)
		setError(null)

		try {
			if (!window.keplr) {
				throw new Error('Keplr wallet not found. Please install the Keplr extension.')
			}

			const chainConfig = REPUBLIC_CHAIN_CONFIG.keplrChainInfo

			// Suggest the chain to Keplr
			try {
				await window.keplr.experimentalSuggestChain(chainConfig)
			} catch (suggestError) {
				console.warn('Chain suggestion failed, trying to enable anyway:', suggestError)
			}

			// Enable the chain
			await window.keplr.enable(chainConfig.chainId)

			// Get the key/address
			const key = await window.keplr.getKey(chainConfig.chainId)

			if (!key.bech32Address.startsWith(REPUBLIC_CHAIN_CONFIG.bech32Prefix)) {
				throw new Error(`Invalid address prefix. Expected ${REPUBLIC_CHAIN_CONFIG.bech32Prefix}, got ${key.bech32Address.split('1')[0]}`)
			}

			setKeplrAddress(key.bech32Address)
			setWalletType('keplr')

			// Store in localStorage for session persistence
			localStorage.setItem('walletType', 'keplr')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to connect Keplr'
			setError(message)
			console.error('Keplr connection error:', err)
		} finally {
			setIsConnecting(false)
		}
	}, [])

	// Connect EVM wallet (opens AppKit modal)
	const connectEvm = useCallback(() => {
		setError(null)
		setWalletType('evm')
		localStorage.setItem('walletType', 'evm')
		// The actual connection is handled by AppKit modal
		// This just sets the intent
	}, [])

	// Disconnect wallet
	const disconnect = useCallback(() => {
		if (walletType === 'evm') {
			disconnectWagmi()
		}

		setWalletType(null)
		setKeplrAddress(null)
		setError(null)
		localStorage.removeItem('walletType')
	}, [walletType, disconnectWagmi])

	// Get display address based on wallet type
	const getDisplayAddress = useCallback(() => {
		if (walletType === 'keplr') return cosmosAddress
		if (walletType === 'evm') return evmAddress
		return null
	}, [walletType, cosmosAddress, evmAddress])

	// Handle EVM wallet connection state changes
	useEffect(() => {
		if (walletType === 'evm' && isEvmConnected && evmWagmiAddress) {
			// EVM wallet connected successfully
			setIsConnecting(false)
		}
	}, [walletType, isEvmConnected, evmWagmiAddress])

	// Restore wallet type from localStorage on mount
	useEffect(() => {
		const savedType = localStorage.getItem('walletType') as WalletType
		if (savedType === 'keplr') {
			// Try to reconnect Keplr
			connectKeplr().catch(console.error)
		} else if (savedType === 'evm') {
			// EVM reconnection is handled by wagmi's persistence
			setWalletType('evm')
		}
	}, [connectKeplr])

	const value: WalletContextValue = {
		isConnected,
		isConnecting,
		walletType,
		evmAddress,
		cosmosAddress,
		error,
		connectKeplr,
		connectEvm,
		disconnect,
		getDisplayAddress,
	}

	return (
		<WalletContext.Provider value={value}>
			{children}
		</WalletContext.Provider>
	)
}

// Default/fallback wallet context when provider is not available
const defaultWalletContext: WalletContextValue = {
	isConnected: false,
	isConnecting: false,
	walletType: null,
	evmAddress: null,
	cosmosAddress: null,
	error: null,
	connectKeplr: async () => { console.warn('Wallet provider not available') },
	connectEvm: () => { console.warn('Wallet provider not available') },
	disconnect: () => {},
	getDisplayAddress: () => null,
}

export function useWallet() {
	const context = useContext(WalletContext)
	// Return default context if provider is not available (wallet feature disabled)
	return context ?? defaultWalletContext
}
