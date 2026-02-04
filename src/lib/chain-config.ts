/**
 * Chain configuration for Republic AI network
 * Used by wallet connections and transaction building
 */

export const REPUBLIC_CHAIN_CONFIG = {
	// Chain identifiers
	chainId: 77701,
	cosmosChainId: 'raitestnet_77701-1',

	// Display info
	chainName: 'Republic AI Testnet',

	// Address prefixes
	bech32Prefix: 'rai',
	validatorPrefix: 'raivaloper',

	// Native token
	nativeCurrency: {
		name: 'RAI',
		symbol: 'RAI',
		decimals: 18,
		denom: 'arai', // Base denom (atto-RAI)
	},

	// Endpoints
	endpoints: {
		evmRpc: 'https://evm-rpc.republicai.io',
		cosmosRpc: 'https://rpc.republicai.io',
		cosmosRest: 'https://rest.republicai.io',
		cosmosGrpc: 'https://grpc.republicai.io',
	},

	// EVM Precompile addresses
	precompiles: {
		staking: '0x0000000000000000000000000000000000000800' as const,
		distribution: '0x0000000000000000000000000000000000000801' as const,
		bech32: '0x0000000000000000000000000000000000000400' as const,
		bank: '0x0000000000000000000000000000000000000804' as const,
	},

	// Staking parameters
	staking: {
		unbondingPeriodDays: 21,
		unbondingPeriodSeconds: 21 * 24 * 60 * 60,
		minDelegation: '1000000000000000000', // 1 RAI in arai
	},

	// Default gas settings
	gas: {
		delegate: 500_000n,
		undelegate: 500_000n,
		redelegate: 500_000n,
		claimRewards: 300_000n,
		setWithdrawAddress: 200_000n,
	},

	// For Keplr chain suggestion
	keplrChainInfo: {
		chainId: 'raitestnet_77701-1',
		chainName: 'Republic AI Testnet',
		rpc: 'https://rpc.republicai.io',
		rest: 'https://rest.republicai.io',
		bip44: {
			coinType: 60, // EVM-compatible derivation
		},
		bech32Config: {
			bech32PrefixAccAddr: 'rai',
			bech32PrefixAccPub: 'raipub',
			bech32PrefixValAddr: 'raivaloper',
			bech32PrefixValPub: 'raivaloperpub',
			bech32PrefixConsAddr: 'raivalcons',
			bech32PrefixConsPub: 'raivalconspub',
		},
		currencies: [
			{
				coinDenom: 'RAI',
				coinMinimalDenom: 'arai',
				coinDecimals: 18,
			},
		],
		feeCurrencies: [
			{
				coinDenom: 'RAI',
				coinMinimalDenom: 'arai',
				coinDecimals: 18,
				gasPriceStep: {
					low: 20000000000,
					average: 25000000000,
					high: 40000000000,
				},
			},
		],
		stakeCurrency: {
			coinDenom: 'RAI',
			coinMinimalDenom: 'arai',
			coinDecimals: 18,
		},
		features: ['eth-address-gen', 'eth-key-sign'],
	},
} as const

export type ChainConfig = typeof REPUBLIC_CHAIN_CONFIG
