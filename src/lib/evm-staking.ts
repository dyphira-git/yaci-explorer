/**
 * EVM Staking Precompile Interface
 * Provides functions to interact with Republic staking via EVM precompiles
 */

import { type WalletClient, encodeFunctionData, type Hex, parseEther } from 'viem'
import { REPUBLIC_CHAIN_CONFIG } from './chain-config'
import { evmToCosmosAddress } from './address'

// Staking Precompile ABI (subset we need)
export const STAKING_ABI = [
	// Events
	{
		type: 'event',
		name: 'Delegate',
		inputs: [
			{ name: 'delegatorAddress', type: 'address', indexed: true },
			{ name: 'validatorAddress', type: 'address', indexed: true },
			{ name: 'amount', type: 'uint256', indexed: false },
			{ name: 'newShares', type: 'uint256', indexed: false },
		],
	},
	{
		type: 'event',
		name: 'Unbond',
		inputs: [
			{ name: 'delegatorAddress', type: 'address', indexed: true },
			{ name: 'validatorAddress', type: 'address', indexed: true },
			{ name: 'amount', type: 'uint256', indexed: false },
			{ name: 'completionTime', type: 'uint256', indexed: false },
		],
	},
	{
		type: 'event',
		name: 'Redelegate',
		inputs: [
			{ name: 'delegatorAddress', type: 'address', indexed: true },
			{ name: 'validatorSrcAddress', type: 'address', indexed: true },
			{ name: 'validatorDstAddress', type: 'address', indexed: true },
			{ name: 'amount', type: 'uint256', indexed: false },
			{ name: 'completionTime', type: 'uint256', indexed: false },
		],
	},
	// Transaction functions
	{
		type: 'function',
		name: 'delegate',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'validatorAddress', type: 'string' },
			{ name: 'amount', type: 'uint256' },
		],
		outputs: [{ name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
	},
	{
		type: 'function',
		name: 'undelegate',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'validatorAddress', type: 'string' },
			{ name: 'amount', type: 'uint256' },
		],
		outputs: [{ name: 'completionTime', type: 'int64' }],
		stateMutability: 'nonpayable',
	},
	{
		type: 'function',
		name: 'redelegate',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'validatorSrcAddress', type: 'string' },
			{ name: 'validatorDstAddress', type: 'string' },
			{ name: 'amount', type: 'uint256' },
		],
		outputs: [{ name: 'completionTime', type: 'int64' }],
		stateMutability: 'nonpayable',
	},
	{
		type: 'function',
		name: 'cancelUnbondingDelegation',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'validatorAddress', type: 'string' },
			{ name: 'amount', type: 'uint256' },
			{ name: 'creationHeight', type: 'uint256' },
		],
		outputs: [{ name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
	},
	// Query functions
	{
		type: 'function',
		name: 'delegation',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'validatorAddress', type: 'string' },
		],
		outputs: [
			{ name: 'shares', type: 'uint256' },
			{
				name: 'balance',
				type: 'tuple',
				components: [
					{ name: 'denom', type: 'string' },
					{ name: 'amount', type: 'uint256' },
				],
			},
		],
		stateMutability: 'view',
	},
] as const

// Distribution Precompile ABI
export const DISTRIBUTION_ABI = [
	{
		type: 'event',
		name: 'WithdrawDelegatorReward',
		inputs: [
			{ name: 'delegatorAddress', type: 'address', indexed: true },
			{ name: 'validatorAddress', type: 'string', indexed: false },
			{ name: 'amount', type: 'uint256', indexed: false },
		],
	},
	{
		type: 'event',
		name: 'SetWithdrawAddress',
		inputs: [
			{ name: 'caller', type: 'address', indexed: true },
			{ name: 'withdrawerAddress', type: 'string', indexed: false },
		],
	},
	{
		type: 'function',
		name: 'withdrawDelegatorReward',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'validatorAddress', type: 'string' },
		],
		outputs: [
			{
				name: '',
				type: 'tuple[]',
				components: [
					{ name: 'denom', type: 'string' },
					{ name: 'amount', type: 'uint256' },
				],
			},
		],
		stateMutability: 'nonpayable',
	},
	{
		type: 'function',
		name: 'setWithdrawAddress',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'withdrawerAddress', type: 'string' },
		],
		outputs: [{ name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
	},
	{
		type: 'function',
		name: 'delegationRewards',
		inputs: [
			{ name: 'delegatorAddress', type: 'address' },
			{ name: 'validatorAddress', type: 'string' },
		],
		outputs: [
			{
				name: '',
				type: 'tuple[]',
				components: [
					{ name: 'denom', type: 'string' },
					{ name: 'amount', type: 'uint256' },
				],
			},
		],
		stateMutability: 'view',
	},
	{
		type: 'function',
		name: 'delegationTotalRewards',
		inputs: [{ name: 'delegatorAddress', type: 'address' }],
		outputs: [
			{
				name: 'rewards',
				type: 'tuple[]',
				components: [
					{ name: 'validatorAddress', type: 'string' },
					{
						name: 'reward',
						type: 'tuple[]',
						components: [
							{ name: 'denom', type: 'string' },
							{ name: 'amount', type: 'uint256' },
						],
					},
				],
			},
			{
				name: 'total',
				type: 'tuple[]',
				components: [
					{ name: 'denom', type: 'string' },
					{ name: 'amount', type: 'uint256' },
				],
			},
		],
		stateMutability: 'view',
	},
] as const

const GAS_LIMIT = 500_000n

export interface StakingTxParams {
	walletClient: WalletClient
	delegatorAddress: Hex
	validatorAddress: string
	amount: string
}

export interface RedelegateTxParams extends StakingTxParams {
	srcValidatorAddress: string
	dstValidatorAddress: string
}

export interface CancelUnbondingParams extends StakingTxParams {
	creationHeight: bigint
}

export interface SetWithdrawAddressParams {
	walletClient: WalletClient
	delegatorAddress: Hex
	withdrawAddress: string
}

/**
 * Delegate tokens to a validator via EVM precompile
 */
export async function evmDelegate({
	walletClient,
	delegatorAddress,
	validatorAddress,
	amount,
}: StakingTxParams): Promise<Hex> {
	const amountWei = parseEther(amount)

	const data = encodeFunctionData({
		abi: STAKING_ABI,
		functionName: 'delegate',
		args: [delegatorAddress, validatorAddress, amountWei],
	})

	const hash = await walletClient.sendTransaction({
		to: REPUBLIC_CHAIN_CONFIG.precompiles.staking as Hex,
		data,
		gas: GAS_LIMIT,
		account: delegatorAddress,
		chain: null,
	})

	return hash
}

/**
 * Undelegate tokens from a validator via EVM precompile
 */
export async function evmUndelegate({
	walletClient,
	delegatorAddress,
	validatorAddress,
	amount,
}: StakingTxParams): Promise<Hex> {
	const amountWei = parseEther(amount)

	const data = encodeFunctionData({
		abi: STAKING_ABI,
		functionName: 'undelegate',
		args: [delegatorAddress, validatorAddress, amountWei],
	})

	const hash = await walletClient.sendTransaction({
		to: REPUBLIC_CHAIN_CONFIG.precompiles.staking as Hex,
		data,
		gas: GAS_LIMIT,
		account: delegatorAddress,
		chain: null,
	})

	return hash
}

/**
 * Redelegate tokens from one validator to another via EVM precompile
 */
export async function evmRedelegate({
	walletClient,
	delegatorAddress,
	srcValidatorAddress,
	dstValidatorAddress,
	amount,
}: RedelegateTxParams): Promise<Hex> {
	const amountWei = parseEther(amount)

	const data = encodeFunctionData({
		abi: STAKING_ABI,
		functionName: 'redelegate',
		args: [delegatorAddress, srcValidatorAddress, dstValidatorAddress, amountWei],
	})

	const hash = await walletClient.sendTransaction({
		to: REPUBLIC_CHAIN_CONFIG.precompiles.staking as Hex,
		data,
		gas: GAS_LIMIT,
		account: delegatorAddress,
		chain: null,
	})

	return hash
}

/**
 * Cancel unbonding delegation via EVM precompile
 */
export async function evmCancelUnbonding({
	walletClient,
	delegatorAddress,
	validatorAddress,
	amount,
	creationHeight,
}: CancelUnbondingParams): Promise<Hex> {
	const amountWei = parseEther(amount)

	const data = encodeFunctionData({
		abi: STAKING_ABI,
		functionName: 'cancelUnbondingDelegation',
		args: [delegatorAddress, validatorAddress, amountWei, creationHeight],
	})

	const hash = await walletClient.sendTransaction({
		to: REPUBLIC_CHAIN_CONFIG.precompiles.staking as Hex,
		data,
		gas: GAS_LIMIT,
		account: delegatorAddress,
		chain: null,
	})

	return hash
}

/**
 * Withdraw delegator rewards from a validator via EVM precompile
 */
export async function evmWithdrawRewards({
	walletClient,
	delegatorAddress,
	validatorAddress,
}: Omit<StakingTxParams, 'amount'>): Promise<Hex> {
	const data = encodeFunctionData({
		abi: DISTRIBUTION_ABI,
		functionName: 'withdrawDelegatorReward',
		args: [delegatorAddress, validatorAddress],
	})

	const hash = await walletClient.sendTransaction({
		to: REPUBLIC_CHAIN_CONFIG.precompiles.distribution as Hex,
		data,
		gas: GAS_LIMIT,
		account: delegatorAddress,
		chain: null,
	})

	return hash
}

/**
 * Set withdraw address for rewards via EVM precompile
 */
export async function evmSetWithdrawAddress({
	walletClient,
	delegatorAddress,
	withdrawAddress,
}: SetWithdrawAddressParams): Promise<Hex> {
	// Convert EVM address to Cosmos format if needed
	const cosmosWithdrawAddr = withdrawAddress.startsWith('0x')
		? evmToCosmosAddress(withdrawAddress)
		: withdrawAddress

	const data = encodeFunctionData({
		abi: DISTRIBUTION_ABI,
		functionName: 'setWithdrawAddress',
		args: [delegatorAddress, cosmosWithdrawAddr],
	})

	const hash = await walletClient.sendTransaction({
		to: REPUBLIC_CHAIN_CONFIG.precompiles.distribution as Hex,
		data,
		gas: GAS_LIMIT,
		account: delegatorAddress,
		chain: null,
	})

	return hash
}
