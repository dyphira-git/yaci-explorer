/**
 * Unified Staking Hook
 * Routes staking transactions to the appropriate method based on connected wallet type
 */

import { useState, useCallback } from 'react'
import { useWalletClient } from 'wagmi'
import { useWallet } from '@/contexts/WalletContext'
import type { Hex } from 'viem'

import {
	evmDelegate,
	evmUndelegate,
	evmRedelegate,
	evmCancelUnbonding,
	evmWithdrawRewards,
	evmSetWithdrawAddress,
} from '@/lib/evm-staking'

import {
	cosmosDelegate,
	cosmosUndelegate,
	cosmosRedelegate,
	cosmosWithdrawRewards,
	cosmosWithdrawAllRewards,
	cosmosSetWithdrawAddress,
} from '@/lib/cosmos-staking'

export type TxStatus = 'idle' | 'pending' | 'success' | 'error'

export interface StakingTxResult {
	hash?: string
	error?: string
}

export interface UseStakingReturn {
	// State
	status: TxStatus
	error: string | null
	txHash: string | null

	// Actions
	delegate: (validatorAddress: string, amount: string) => Promise<StakingTxResult>
	undelegate: (validatorAddress: string, amount: string) => Promise<StakingTxResult>
	redelegate: (srcValidator: string, dstValidator: string, amount: string) => Promise<StakingTxResult>
	cancelUnbonding: (validatorAddress: string, amount: string, creationHeight: bigint) => Promise<StakingTxResult>
	withdrawRewards: (validatorAddress: string) => Promise<StakingTxResult>
	withdrawAllRewards: (validatorAddresses: string[]) => Promise<StakingTxResult>
	setWithdrawAddress: (withdrawAddress: string) => Promise<StakingTxResult>

	// Helpers
	reset: () => void
	isReady: boolean
}

/**
 * Hook for executing staking transactions
 * Automatically routes to EVM precompile or Cosmos SDK based on wallet type
 */
export function useStaking(): UseStakingReturn {
	const { isConnected, walletType, evmAddress, cosmosAddress } = useWallet()
	const { data: walletClient } = useWalletClient()

	const [status, setStatus] = useState<TxStatus>('idle')
	const [error, setError] = useState<string | null>(null)
	const [txHash, setTxHash] = useState<string | null>(null)

	const reset = useCallback(() => {
		setStatus('idle')
		setError(null)
		setTxHash(null)
	}, [])

	const isReady = isConnected && (walletType === 'evm' ? !!walletClient : true)

	/**
	 * Execute an EVM staking action
	 */
	const executeEvmAction = useCallback(
		async <T>(action: (client: NonNullable<typeof walletClient>) => Promise<Hex>): Promise<StakingTxResult> => {
			if (!walletClient || !evmAddress) {
				return { error: 'EVM wallet not connected' }
			}

			setStatus('pending')
			setError(null)
			setTxHash(null)

			try {
				const hash = await action(walletClient)
				setTxHash(hash)
				setStatus('success')
				return { hash }
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Transaction failed'
				setError(message)
				setStatus('error')
				return { error: message }
			}
		},
		[walletClient, evmAddress]
	)

	/**
	 * Execute a Cosmos staking action
	 */
	const executeCosmosAction = useCallback(
		async <T>(action: () => Promise<{ txHash: string }>): Promise<StakingTxResult> => {
			if (!cosmosAddress) {
				return { error: 'Cosmos wallet not connected' }
			}

			setStatus('pending')
			setError(null)
			setTxHash(null)

			try {
				const result = await action()
				setTxHash(result.txHash)
				setStatus('success')
				return { hash: result.txHash }
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Transaction failed'
				setError(message)
				setStatus('error')
				return { error: message }
			}
		},
		[cosmosAddress]
	)

	/**
	 * Delegate tokens to a validator
	 */
	const delegate = useCallback(
		async (validatorAddress: string, amount: string): Promise<StakingTxResult> => {
			if (walletType === 'evm') {
				return executeEvmAction((client) =>
					evmDelegate({
						walletClient: client,
						delegatorAddress: evmAddress as Hex,
						validatorAddress,
						amount,
					})
				)
			} else if (walletType === 'keplr') {
				return executeCosmosAction(() =>
					cosmosDelegate({
						delegatorAddress: cosmosAddress!,
						validatorAddress,
						amount,
					})
				)
			}
			return { error: 'No wallet connected' }
		},
		[walletType, evmAddress, cosmosAddress, executeEvmAction, executeCosmosAction]
	)

	/**
	 * Undelegate tokens from a validator
	 */
	const undelegate = useCallback(
		async (validatorAddress: string, amount: string): Promise<StakingTxResult> => {
			if (walletType === 'evm') {
				return executeEvmAction((client) =>
					evmUndelegate({
						walletClient: client,
						delegatorAddress: evmAddress as Hex,
						validatorAddress,
						amount,
					})
				)
			} else if (walletType === 'keplr') {
				return executeCosmosAction(() =>
					cosmosUndelegate({
						delegatorAddress: cosmosAddress!,
						validatorAddress,
						amount,
					})
				)
			}
			return { error: 'No wallet connected' }
		},
		[walletType, evmAddress, cosmosAddress, executeEvmAction, executeCosmosAction]
	)

	/**
	 * Redelegate tokens from one validator to another
	 */
	const redelegate = useCallback(
		async (srcValidator: string, dstValidator: string, amount: string): Promise<StakingTxResult> => {
			if (walletType === 'evm') {
				return executeEvmAction((client) =>
					evmRedelegate({
						walletClient: client,
						delegatorAddress: evmAddress as Hex,
						srcValidatorAddress: srcValidator,
						dstValidatorAddress: dstValidator,
						amount,
						validatorAddress: srcValidator,
					})
				)
			} else if (walletType === 'keplr') {
				return executeCosmosAction(() =>
					cosmosRedelegate({
						delegatorAddress: cosmosAddress!,
						srcValidatorAddress: srcValidator,
						dstValidatorAddress: dstValidator,
						amount,
					})
				)
			}
			return { error: 'No wallet connected' }
		},
		[walletType, evmAddress, cosmosAddress, executeEvmAction, executeCosmosAction]
	)

	/**
	 * Cancel unbonding delegation (EVM only - Cosmos SDK doesn't support this via standard msgs)
	 */
	const cancelUnbonding = useCallback(
		async (validatorAddress: string, amount: string, creationHeight: bigint): Promise<StakingTxResult> => {
			if (walletType === 'evm') {
				return executeEvmAction((client) =>
					evmCancelUnbonding({
						walletClient: client,
						delegatorAddress: evmAddress as Hex,
						validatorAddress,
						amount,
						creationHeight,
					})
				)
			} else if (walletType === 'keplr') {
				return { error: 'Cancel unbonding not supported via Keplr. Use EVM wallet.' }
			}
			return { error: 'No wallet connected' }
		},
		[walletType, evmAddress, executeEvmAction]
	)

	/**
	 * Withdraw rewards from a single validator
	 */
	const withdrawRewards = useCallback(
		async (validatorAddress: string): Promise<StakingTxResult> => {
			if (walletType === 'evm') {
				return executeEvmAction((client) =>
					evmWithdrawRewards({
						walletClient: client,
						delegatorAddress: evmAddress as Hex,
						validatorAddress,
					})
				)
			} else if (walletType === 'keplr') {
				return executeCosmosAction(() =>
					cosmosWithdrawRewards({
						delegatorAddress: cosmosAddress!,
						validatorAddress,
					})
				)
			}
			return { error: 'No wallet connected' }
		},
		[walletType, evmAddress, cosmosAddress, executeEvmAction, executeCosmosAction]
	)

	/**
	 * Withdraw rewards from multiple validators
	 */
	const withdrawAllRewards = useCallback(
		async (validatorAddresses: string[]): Promise<StakingTxResult> => {
			if (walletType === 'evm') {
				// For EVM, we need to call withdraw for each validator
				// This could be batched with a multicall contract, but for simplicity we do sequential
				for (const validatorAddress of validatorAddresses) {
					const result = await executeEvmAction((client) =>
						evmWithdrawRewards({
							walletClient: client,
							delegatorAddress: evmAddress as Hex,
							validatorAddress,
						})
					)
					if (result.error) return result
				}
				return { hash: txHash || undefined }
			} else if (walletType === 'keplr') {
				return executeCosmosAction(() =>
					cosmosWithdrawAllRewards(cosmosAddress!, validatorAddresses)
				)
			}
			return { error: 'No wallet connected' }
		},
		[walletType, evmAddress, cosmosAddress, txHash, executeEvmAction, executeCosmosAction]
	)

	/**
	 * Set withdraw address for rewards
	 */
	const setWithdrawAddress = useCallback(
		async (withdrawAddress: string): Promise<StakingTxResult> => {
			if (walletType === 'evm') {
				return executeEvmAction((client) =>
					evmSetWithdrawAddress({
						walletClient: client,
						delegatorAddress: evmAddress as Hex,
						withdrawAddress,
					})
				)
			} else if (walletType === 'keplr') {
				return executeCosmosAction(() =>
					cosmosSetWithdrawAddress({
						delegatorAddress: cosmosAddress!,
						withdrawAddress,
					})
				)
			}
			return { error: 'No wallet connected' }
		},
		[walletType, evmAddress, cosmosAddress, executeEvmAction, executeCosmosAction]
	)

	return {
		status,
		error,
		txHash,
		delegate,
		undelegate,
		redelegate,
		cancelUnbonding,
		withdrawRewards,
		withdrawAllRewards,
		setWithdrawAddress,
		reset,
		isReady,
	}
}
