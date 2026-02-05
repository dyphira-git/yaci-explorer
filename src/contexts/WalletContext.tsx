/**
 * Wallet Context - Unified wallet state management for both Keplr (Cosmos) and EVM wallets
 * Uses direct EIP-1193 provider access (window.ethereum) instead of wagmi to avoid Bun bundling issues
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createWalletClient, createPublicClient, custom, http, type WalletClient, formatEther } from 'viem'
import { evmToCosmosAddress, cosmosToEvmAddress } from '@/lib/address'
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
	connectEvm: () => Promise<void>
	disconnect: () => void

	// Utility
	getDisplayAddress: () => string | null
	refreshBalance: () => Promise<void>

	// Balance (in human-readable format, e.g., "1.5" RAI)
	balance: string | null
	isLoadingBalance: boolean

	// Wallet client for transactions
	walletClient: WalletClient | null
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
		ethereum?: {
			isMetaMask?: boolean
			request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
			on: (event: string, handler: (...args: unknown[]) => void) => void
			removeListener: (event: string, handler: (...args: unknown[]) => void) => void
		}
	}
}

// Define Republic chain for viem
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
} as const

// Create a public client for reading chain data (balances, etc.)
const publicClient = createPublicClient({
	chain: republicChain,
	transport: http(REPUBLIC_CHAIN_CONFIG.endpoints.evmRpc),
})

export function WalletProvider({ children }: { children: ReactNode }) {
	const [walletType, setWalletType] = useState<WalletType>(null)
	const [evmAddress, setEvmAddress] = useState<string | null>(null)
	const [keplrAddress, setKeplrAddress] = useState<string | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [walletClient, setWalletClient] = useState<WalletClient | null>(null)
	const [balance, setBalance] = useState<string | null>(null)
	const [isLoadingBalance, setIsLoadingBalance] = useState(false)

	// Derive cosmos address from EVM or use Keplr's directly
	const cosmosAddress = walletType === 'keplr' && keplrAddress
		? keplrAddress
		: walletType === 'evm' && evmAddress
			? evmToCosmosAddress(evmAddress)
			: null

	// Derive EVM address from Keplr's cosmos address or use direct EVM address
	const derivedEvmAddress = walletType === 'evm' && evmAddress
		? evmAddress
		: walletType === 'keplr' && keplrAddress
			? cosmosToEvmAddress(keplrAddress)
			: null

	const isConnected = walletType !== null && (
		(walletType === 'keplr' && keplrAddress !== null) ||
		(walletType === 'evm' && evmAddress !== null)
	)

	// Fetch balance using EVM JSON-RPC
	const refreshBalance = useCallback(async () => {
		const addressToCheck = derivedEvmAddress
		if (!addressToCheck) {
			setBalance(null)
			return
		}

		setIsLoadingBalance(true)
		try {
			const balanceWei = await publicClient.getBalance({
				address: addressToCheck as `0x${string}`,
			})
			// Format from wei (18 decimals) to human-readable
			const formatted = formatEther(balanceWei)
			// Trim to reasonable precision (6 decimal places)
			const parts = formatted.split('.')
			if (parts.length === 2 && parts[1].length > 6) {
				setBalance(`${parts[0]}.${parts[1].slice(0, 6)}`)
			} else {
				setBalance(formatted)
			}
		} catch (err) {
			console.error('Failed to fetch balance:', err)
			setBalance(null)
		} finally {
			setIsLoadingBalance(false)
		}
	}, [derivedEvmAddress])

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
			setEvmAddress(null)
			setWalletClient(null)

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

	// Connect EVM wallet using direct window.ethereum access
	const connectEvm = useCallback(async () => {
		setIsConnecting(true)
		setError(null)

		try {
			if (!window.ethereum) {
				throw new Error('No EVM wallet found. Please install MetaMask or another browser wallet.')
			}

			// Request accounts
			const accounts = await window.ethereum.request({
				method: 'eth_requestAccounts',
			}) as string[]

			if (!accounts || accounts.length === 0) {
				throw new Error('No accounts returned from wallet')
			}

			const address = accounts[0]

			// Try to switch to Republic chain
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: `0x${REPUBLIC_CHAIN_CONFIG.chainId.toString(16)}` }],
				})
			} catch (switchError: unknown) {
				// Chain not added, try to add it
				if ((switchError as { code?: number })?.code === 4902) {
					await window.ethereum.request({
						method: 'wallet_addEthereumChain',
						params: [{
							chainId: `0x${REPUBLIC_CHAIN_CONFIG.chainId.toString(16)}`,
							chainName: REPUBLIC_CHAIN_CONFIG.chainName,
							nativeCurrency: REPUBLIC_CHAIN_CONFIG.nativeCurrency,
							rpcUrls: [REPUBLIC_CHAIN_CONFIG.endpoints.evmRpc],
							blockExplorerUrls: ['https://explorer.republicai.io'],
						}],
					})
				} else {
					console.warn('Failed to switch chain:', switchError)
				}
			}

			// Create viem wallet client
			const client = createWalletClient({
				account: address as `0x${string}`,
				chain: republicChain,
				transport: custom(window.ethereum),
			})

			setEvmAddress(address)
			setWalletType('evm')
			setKeplrAddress(null)
			setWalletClient(client)

			localStorage.setItem('walletType', 'evm')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to connect EVM wallet'
			setError(message)
			console.error('EVM connection error:', err)
		} finally {
			setIsConnecting(false)
		}
	}, [])

	// Disconnect wallet
	const disconnect = useCallback(() => {
		setWalletType(null)
		setEvmAddress(null)
		setKeplrAddress(null)
		setWalletClient(null)
		setError(null)
		localStorage.removeItem('walletType')
	}, [])

	// Get display address based on wallet type
	const getDisplayAddress = useCallback(() => {
		if (walletType === 'keplr') return cosmosAddress
		if (walletType === 'evm') return evmAddress
		return null
	}, [walletType, cosmosAddress, evmAddress])

	// Fetch balance when connected or address changes
	useEffect(() => {
		if (isConnected && derivedEvmAddress) {
			refreshBalance()
		} else {
			setBalance(null)
		}
	}, [isConnected, derivedEvmAddress, refreshBalance])

	// Listen for account changes
	useEffect(() => {
		if (!window.ethereum || walletType !== 'evm') return

		const handleAccountsChanged = (accounts: unknown) => {
			const accts = accounts as string[]
			if (accts.length === 0) {
				disconnect()
			} else if (accts[0] !== evmAddress) {
				setEvmAddress(accts[0])
				// Update wallet client with new account
				if (window.ethereum) {
					const client = createWalletClient({
						account: accts[0] as `0x${string}`,
						chain: republicChain,
						transport: custom(window.ethereum),
					})
					setWalletClient(client)
				}
			}
		}

		window.ethereum.on('accountsChanged', handleAccountsChanged)
		return () => {
			window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
		}
	}, [walletType, evmAddress, disconnect])

	// Restore wallet connection on mount
	useEffect(() => {
		const savedType = localStorage.getItem('walletType') as WalletType
		if (savedType === 'keplr') {
			connectKeplr().catch(console.error)
		} else if (savedType === 'evm') {
			// Check if still connected
			if (window.ethereum) {
				window.ethereum.request({ method: 'eth_accounts' })
					.then((accounts) => {
						const accts = accounts as string[]
						if (accts.length > 0 && window.ethereum) {
							setEvmAddress(accts[0])
							setWalletType('evm')
							const client = createWalletClient({
								account: accts[0] as `0x${string}`,
								chain: republicChain,
								transport: custom(window.ethereum),
							})
							setWalletClient(client)
						}
					})
					.catch(console.error)
			}
		}
	}, [connectKeplr])

	const value: WalletContextValue = {
		isConnected,
		isConnecting,
		walletType,
		evmAddress: derivedEvmAddress,
		cosmosAddress,
		error,
		connectKeplr,
		connectEvm,
		disconnect,
		getDisplayAddress,
		refreshBalance,
		balance,
		isLoadingBalance,
		walletClient,
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
	connectEvm: async () => { console.warn('Wallet provider not available') },
	disconnect: () => {},
	getDisplayAddress: () => null,
	refreshBalance: async () => {},
	balance: null,
	isLoadingBalance: false,
	walletClient: null,
}

export function useWallet() {
	const context = useContext(WalletContext)
	// Return default context if provider is not available (wallet feature disabled)
	return context ?? defaultWalletContext
}
