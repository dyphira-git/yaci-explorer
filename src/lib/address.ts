/**
 * Address conversion utilities for EVM <-> Cosmos address formats
 * Both formats derive from the same secp256k1 public key
 */

import { bech32 } from 'bech32'

const DEFAULT_PREFIX = 'rai'

/**
 * Convert an EVM hex address to Cosmos bech32 format
 */
export function evmToCosmosAddress(evmAddress: string, prefix = DEFAULT_PREFIX): string {
	if (!isEvmAddress(evmAddress)) {
		throw new Error(`Invalid EVM address: ${evmAddress}`)
	}

	const addressBytes = hexToBytes(evmAddress.slice(2))
	const words = bech32.toWords(addressBytes)
	return bech32.encode(prefix, words)
}

/**
 * Convert a Cosmos bech32 address to EVM hex format
 */
export function cosmosToEvmAddress(cosmosAddress: string): string {
	if (!isCosmosAddress(cosmosAddress)) {
		throw new Error(`Invalid Cosmos address: ${cosmosAddress}`)
	}

	const decoded = bech32.decode(cosmosAddress)
	const addressBytes = bech32.fromWords(decoded.words)
	return `0x${bytesToHex(new Uint8Array(addressBytes))}`
}

/**
 * Check if an address is a valid EVM hex address
 */
export function isEvmAddress(address: string): boolean {
	if (!address) return false
	return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Check if an address is a valid Cosmos bech32 address
 */
export function isCosmosAddress(address: string, expectedPrefix?: string): boolean {
	if (!address) return false
	try {
		const decoded = bech32.decode(address)
		if (expectedPrefix && decoded.prefix !== expectedPrefix) {
			return false
		}
		const bytes = bech32.fromWords(decoded.words)
		return bytes.length === 20 // Standard address length
	} catch {
		return false
	}
}

/**
 * Convert an EVM hex address to validator operator address format
 */
export function evmToValidatorAddress(evmAddress: string, prefix = DEFAULT_PREFIX): string {
	return evmToCosmosAddress(evmAddress, `${prefix}valoper`)
}

/**
 * Detect address type and return normalized info
 */
export function parseAddress(address: string, prefix = DEFAULT_PREFIX): {
	type: 'evm' | 'cosmos' | 'unknown'
	evmAddress: string | null
	cosmosAddress: string | null
	isValidator: boolean
} {
	if (isEvmAddress(address)) {
		return {
			type: 'evm',
			evmAddress: address.toLowerCase(),
			cosmosAddress: evmToCosmosAddress(address, prefix),
			isValidator: false
		}
	}

	if (isCosmosAddress(address)) {
		const decoded = bech32.decode(address)
		const isValidator = decoded.prefix.includes('valoper')
		const accountPrefix = isValidator ? decoded.prefix.replace('valoper', '') : decoded.prefix

		return {
			type: 'cosmos',
			evmAddress: cosmosToEvmAddress(address),
			cosmosAddress: address,
			isValidator
		}
	}

	return {
		type: 'unknown',
		evmAddress: null,
		cosmosAddress: null,
		isValidator: false
	}
}

/**
 * Truncate an address for display (works with both formats)
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
	if (!address) return ''
	if (address.length <= startChars + endChars + 3) return address
	return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2)
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
	}
	return bytes
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')
}
