/**
 * Set Withdraw Address Modal Component
 * Modal for changing the reward withdraw address
 */

import { useState, useEffect } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TransactionStatus } from './TransactionStatus'
import { useStaking } from '@/hooks/useStaking'
import { useWallet } from '@/contexts/WalletContext'
import { isEvmAddress, isCosmosAddress } from '@/lib/address'
import { REPUBLIC_CHAIN_CONFIG } from '@/lib/chain-config'
import { css } from '@/styled-system/css'

interface SetWithdrawAddressModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentWithdrawAddress?: string
}

export function SetWithdrawAddressModal({
	open,
	onOpenChange,
	currentWithdrawAddress,
}: SetWithdrawAddressModalProps) {
	const [address, setAddress] = useState('')
	const [validationError, setValidationError] = useState<string | null>(null)
	const { isConnected, walletType, cosmosAddress, evmAddress } = useWallet()
	const { setWithdrawAddress, status, error, txHash, reset, isReady } = useStaking()

	useEffect(() => {
		if (!open) {
			setAddress('')
			setValidationError(null)
			reset()
		}
	}, [open, reset])

	const validateAddress = (addr: string): boolean => {
		if (!addr) {
			setValidationError(null)
			return false
		}

		if (isEvmAddress(addr)) {
			setValidationError(null)
			return true
		}

		if (isCosmosAddress(addr, REPUBLIC_CHAIN_CONFIG.bech32Prefix)) {
			setValidationError(null)
			return true
		}

		setValidationError('Invalid address. Enter a valid EVM (0x...) or Cosmos (rai1...) address.')
		return false
	}

	const handleAddressChange = (value: string) => {
		setAddress(value)
		validateAddress(value)
	}

	const handleUseSelf = () => {
		const selfAddress = walletType === 'keplr' ? cosmosAddress : evmAddress
		if (selfAddress) {
			setAddress(selfAddress)
			validateAddress(selfAddress)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!validateAddress(address)) return

		await setWithdrawAddress(address)
	}

	const isLoading = status === 'pending'
	const canSubmit = isReady && address && !validationError && !isLoading

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Set Reward Withdraw Address</DialogTitle>
					<DialogDescription>
						Change the address where staking rewards are sent
					</DialogDescription>
				</DialogHeader>

				{!isConnected ? (
					<div className={styles.notConnected}>
						<p>Please connect your wallet to change withdraw address.</p>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						{currentWithdrawAddress && (
							<div className={styles.currentAddress}>
								<span className={styles.currentLabel}>Current withdraw address:</span>
								<span className={styles.currentValue}>{currentWithdrawAddress}</span>
							</div>
						)}

						<div className={styles.formGroup}>
							<div className={styles.labelRow}>
								<Label htmlFor="address">New Withdraw Address</Label>
								<button type="button" onClick={handleUseSelf} className={styles.selfButton}>
									Use my address
								</button>
							</div>
							<Input
								id="address"
								type="text"
								placeholder="rai1... or 0x..."
								value={address}
								onChange={(e) => handleAddressChange(e.target.value)}
								disabled={isLoading}
							/>
							{validationError && <p className={styles.error}>{validationError}</p>}
							<p className={styles.hint}>
								You can enter either an EVM address (0x...) or a Cosmos address (rai1...).
								Rewards will be sent to this address when claimed.
							</p>
						</div>

						<TransactionStatus status={status} txHash={txHash} error={error} />

						<DialogFooter className={styles.footer}>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!canSubmit}>
								{isLoading ? 'Setting...' : 'Set Address'}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}

const styles = {
	notConnected: css({
		py: '6',
		textAlign: 'center',
		color: 'fg.muted',
	}),
	currentAddress: css({
		mb: '4',
		p: '3',
		rounded: 'md',
		bg: 'bg.subtle',
		fontSize: 'sm',
	}),
	currentLabel: css({
		display: 'block',
		color: 'fg.muted',
		mb: '1',
	}),
	currentValue: css({
		fontFamily: 'mono',
		fontSize: 'xs',
		wordBreak: 'break-all',
	}),
	formGroup: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '2',
		mb: '4',
	}),
	labelRow: css({
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
	}),
	selfButton: css({
		fontSize: 'xs',
		color: 'accent.default',
		cursor: 'pointer',
		_hover: { textDecoration: 'underline' },
	}),
	hint: css({
		fontSize: 'xs',
		color: 'fg.muted',
	}),
	error: css({
		fontSize: 'xs',
		color: 'red.500',
	}),
	footer: css({
		mt: '4',
	}),
}
