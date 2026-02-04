/**
 * Cosmos SDK Staking Transaction Builders
 * Provides functions to build and broadcast staking transactions via Keplr
 */

import { bech32 } from 'bech32'
import { REPUBLIC_CHAIN_CONFIG } from './chain-config'

// Message type URLs
const MSG_DELEGATE = '/cosmos.staking.v1beta1.MsgDelegate'
const MSG_UNDELEGATE = '/cosmos.staking.v1beta1.MsgUndelegate'
const MSG_REDELEGATE = '/cosmos.staking.v1beta1.MsgBeginRedelegate'
const MSG_WITHDRAW_REWARDS = '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward'
const MSG_SET_WITHDRAW_ADDRESS = '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress'

export interface CosmosStakingParams {
	delegatorAddress: string
	validatorAddress: string
	amount: string
}

export interface CosmosRedelegateParams {
	delegatorAddress: string
	srcValidatorAddress: string
	dstValidatorAddress: string
	amount: string
}

export interface CosmosSetWithdrawAddressParams {
	delegatorAddress: string
	withdrawAddress: string
}

export interface TxResult {
	txHash: string
	code: number
	rawLog?: string
}

/**
 * Get Keplr instance, throwing if not available
 */
function getKeplr() {
	if (typeof window === 'undefined' || !window.keplr) {
		throw new Error('Keplr wallet not found')
	}
	return window.keplr
}

/**
 * Get account info from chain for signing
 */
async function getAccountInfo(address: string): Promise<{ accountNumber: number; sequence: number }> {
	const response = await fetch(
		`${REPUBLIC_CHAIN_CONFIG.endpoints.cosmosRest}/cosmos/auth/v1beta1/accounts/${address}`
	)

	if (!response.ok) {
		if (response.status === 404) {
			return { accountNumber: 0, sequence: 0 }
		}
		throw new Error(`Failed to get account info: ${response.statusText}`)
	}

	const data = await response.json()
	const account = data.account

	// Handle EthAccount type (Republic uses eth_secp256k1)
	if (account?.['@type']?.includes('EthAccount')) {
		return {
			accountNumber: parseInt(account.base_account?.account_number || '0', 10),
			sequence: parseInt(account.base_account?.sequence || '0', 10),
		}
	}

	// Handle BaseAccount
	return {
		accountNumber: parseInt(account?.account_number || '0', 10),
		sequence: parseInt(account?.sequence || '0', 10),
	}
}

/**
 * Convert amount string to coin object
 * Handles both display denomination (RAI) and base denomination (arai)
 */
function toCoin(amount: string): { denom: string; amount: string } {
	// Parse amount - if it contains decimals, it's in display format
	const parsed = parseFloat(amount)
	if (isNaN(parsed)) {
		throw new Error('Invalid amount')
	}

	// Convert to base denomination (18 decimals)
	const baseAmount = BigInt(Math.floor(parsed * 1e18))

	return {
		denom: REPUBLIC_CHAIN_CONFIG.nativeCurrency.denom,
		amount: baseAmount.toString(),
	}
}

/**
 * Default fee for staking transactions
 */
function getDefaultFee() {
	return {
		amount: [{ denom: REPUBLIC_CHAIN_CONFIG.nativeCurrency.denom, amount: '100000000000000000' }],
		gas: '500000',
	}
}

/**
 * Convert EVM hex address to Cosmos bech32
 */
function evmToCosmos(hexAddress: string): string {
	const addressBytes = Buffer.from(hexAddress.slice(2), 'hex')
	const words = bech32.toWords(addressBytes)
	return bech32.encode(REPUBLIC_CHAIN_CONFIG.bech32Prefix, words)
}

/**
 * Sign and broadcast a Cosmos SDK message via Keplr
 */
async function signAndBroadcast(
	delegatorAddress: string,
	messages: Array<{ typeUrl: string; value: Record<string, unknown> }>,
	memo = ''
): Promise<TxResult> {
	const keplr = getKeplr()
	const chainId = REPUBLIC_CHAIN_CONFIG.cosmosChainId

	// Ensure Keplr is connected to our chain
	await keplr.enable(chainId)

	const offlineSigner = keplr.getOfflineSigner(chainId) as {
		getAccounts: () => Promise<Array<{ address: string; pubkey: Uint8Array }>>
	}
	const accounts = await offlineSigner.getAccounts()

	if (accounts.length === 0) {
		throw new Error('No accounts found in Keplr')
	}

	const account = accounts[0]
	if (account.address !== delegatorAddress) {
		throw new Error(`Keplr account mismatch: expected ${delegatorAddress}, got ${account.address}`)
	}

	const { accountNumber, sequence } = await getAccountInfo(delegatorAddress)
	const fee = getDefaultFee()

	// Build amino sign doc
	const signDoc = {
		chain_id: chainId,
		account_number: accountNumber.toString(),
		sequence: sequence.toString(),
		fee,
		msgs: messages.map((m) => ({
			type: m.typeUrl.replace(/^\//, '').replace(/\./g, '/').replace(/Msg/, 'cosmos-sdk/Msg'),
			value: m.value,
		})),
		memo,
	}

	// Sign with amino
	const signResponse = await (keplr as unknown as {
		signAmino: (
			chainId: string,
			signer: string,
			signDoc: unknown
		) => Promise<{ signature: { signature: string } }>
	}).signAmino(chainId, delegatorAddress, signDoc)

	// Construct and broadcast the transaction
	const txRaw = {
		body: {
			messages: messages.map((m) => ({
				'@type': m.typeUrl,
				...m.value,
			})),
			memo,
		},
		auth_info: {
			signer_infos: [
				{
					public_key: {
						'@type': '/cosmos.evm.crypto.v1.ethsecp256k1.PubKey',
						key: Buffer.from(account.pubkey).toString('base64'),
					},
					mode_info: { single: { mode: 'SIGN_MODE_LEGACY_AMINO_JSON' } },
					sequence: sequence.toString(),
				},
			],
			fee,
		},
		signatures: [signResponse.signature.signature],
	}

	// Broadcast using the REST endpoint
	const response = await fetch(`${REPUBLIC_CHAIN_CONFIG.endpoints.cosmosRest}/cosmos/tx/v1beta1/txs`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			tx: txRaw,
			mode: 'BROADCAST_MODE_SYNC',
		}),
	})

	if (!response.ok) {
		const errorData = await response.json()
		throw new Error(`Broadcast failed: ${JSON.stringify(errorData)}`)
	}

	const result = await response.json()
	const txResponse = result.tx_response

	if (txResponse.code !== 0) {
		throw new Error(`Transaction failed: ${txResponse.raw_log || txResponse.log}`)
	}

	return {
		txHash: txResponse.txhash,
		code: txResponse.code,
		rawLog: txResponse.raw_log,
	}
}

/**
 * Delegate tokens to a validator via Keplr
 */
export async function cosmosDelegate({
	delegatorAddress,
	validatorAddress,
	amount,
}: CosmosStakingParams): Promise<TxResult> {
	const coin = toCoin(amount)

	const message = {
		typeUrl: MSG_DELEGATE,
		value: {
			delegator_address: delegatorAddress,
			validator_address: validatorAddress,
			amount: coin,
		},
	}

	return signAndBroadcast(delegatorAddress, [message])
}

/**
 * Undelegate tokens from a validator via Keplr
 */
export async function cosmosUndelegate({
	delegatorAddress,
	validatorAddress,
	amount,
}: CosmosStakingParams): Promise<TxResult> {
	const coin = toCoin(amount)

	const message = {
		typeUrl: MSG_UNDELEGATE,
		value: {
			delegator_address: delegatorAddress,
			validator_address: validatorAddress,
			amount: coin,
		},
	}

	return signAndBroadcast(delegatorAddress, [message])
}

/**
 * Redelegate tokens from one validator to another via Keplr
 */
export async function cosmosRedelegate({
	delegatorAddress,
	srcValidatorAddress,
	dstValidatorAddress,
	amount,
}: CosmosRedelegateParams): Promise<TxResult> {
	const coin = toCoin(amount)

	const message = {
		typeUrl: MSG_REDELEGATE,
		value: {
			delegator_address: delegatorAddress,
			validator_src_address: srcValidatorAddress,
			validator_dst_address: dstValidatorAddress,
			amount: coin,
		},
	}

	return signAndBroadcast(delegatorAddress, [message])
}

/**
 * Withdraw delegator rewards from a validator via Keplr
 */
export async function cosmosWithdrawRewards({
	delegatorAddress,
	validatorAddress,
}: Omit<CosmosStakingParams, 'amount'>): Promise<TxResult> {
	const message = {
		typeUrl: MSG_WITHDRAW_REWARDS,
		value: {
			delegator_address: delegatorAddress,
			validator_address: validatorAddress,
		},
	}

	return signAndBroadcast(delegatorAddress, [message])
}

/**
 * Withdraw all delegator rewards from multiple validators via Keplr
 */
export async function cosmosWithdrawAllRewards(
	delegatorAddress: string,
	validatorAddresses: string[]
): Promise<TxResult> {
	const messages = validatorAddresses.map((validatorAddress) => ({
		typeUrl: MSG_WITHDRAW_REWARDS,
		value: {
			delegator_address: delegatorAddress,
			validator_address: validatorAddress,
		},
	}))

	return signAndBroadcast(delegatorAddress, messages)
}

/**
 * Set withdraw address for rewards via Keplr
 */
export async function cosmosSetWithdrawAddress({
	delegatorAddress,
	withdrawAddress,
}: CosmosSetWithdrawAddressParams): Promise<TxResult> {
	// Convert EVM address to Cosmos format if needed
	const cosmosWithdrawAddr = withdrawAddress.startsWith('0x')
		? evmToCosmos(withdrawAddress)
		: withdrawAddress

	const message = {
		typeUrl: MSG_SET_WITHDRAW_ADDRESS,
		value: {
			delegator_address: delegatorAddress,
			withdraw_address: cosmosWithdrawAddr,
		},
	}

	return signAndBroadcast(delegatorAddress, [message])
}
