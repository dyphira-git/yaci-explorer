/**
 * Undelegate Modal Component
 * Modal for undelegating tokens from a validator
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
import { REPUBLIC_CHAIN_CONFIG } from '@/lib/chain-config'
import { css } from '@/styled-system/css'

interface UndelegateModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	validatorAddress: string
	validatorMoniker?: string
	currentDelegation?: string
}

export function UndelegateModal({
	open,
	onOpenChange,
	validatorAddress,
	validatorMoniker,
	currentDelegation,
}: UndelegateModalProps) {
	const [amount, setAmount] = useState('')
	const { isConnected, walletType } = useWallet()
	const { undelegate, status, error, txHash, reset, isReady } = useStaking()

	useEffect(() => {
		if (!open) {
			setAmount('')
			reset()
		}
	}, [open, reset])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!amount || parseFloat(amount) <= 0) return

		await undelegate(validatorAddress, amount)
	}

	const handleMax = () => {
		if (currentDelegation) {
			setAmount(currentDelegation)
		}
	}

	const isLoading = status === 'pending'
	const canSubmit = isReady && amount && parseFloat(amount) > 0 && !isLoading

	const unbondingDays = REPUBLIC_CHAIN_CONFIG.staking.unbondingPeriodDays

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Undelegate RAI</DialogTitle>
					<DialogDescription>
						Undelegate tokens from {validatorMoniker || validatorAddress}
					</DialogDescription>
				</DialogHeader>

				{!isConnected ? (
					<div className={styles.notConnected}>
						<p>Please connect your wallet to undelegate tokens.</p>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						<div className={styles.warning}>
							<strong>Unbonding Period:</strong> Your tokens will be locked for {unbondingDays} days
							during unbonding. You will not earn staking rewards during this period.
						</div>

						<div className={styles.formGroup}>
							<div className={styles.labelRow}>
								<Label htmlFor="amount">Amount (RAI)</Label>
								{currentDelegation && (
									<button type="button" onClick={handleMax} className={styles.maxButton}>
										Max: {currentDelegation}
									</button>
								)}
							</div>
							<Input
								id="amount"
								type="number"
								step="0.000000000000000001"
								min="0"
								placeholder="0.0"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								disabled={isLoading}
							/>
							<p className={styles.hint}>
								Connected via {walletType === 'keplr' ? 'Keplr' : 'EVM wallet'}
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
							<Button type="submit" disabled={!canSubmit} variant="destructive">
								{isLoading ? 'Undelegating...' : 'Undelegate'}
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
	warning: css({
		mb: '4',
		p: '3',
		rounded: 'md',
		bg: 'yellow.950',
		color: 'yellow.200',
		fontSize: 'sm',
		borderWidth: '1px',
		borderColor: 'yellow.800',
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
	maxButton: css({
		fontSize: 'xs',
		color: 'accent.default',
		cursor: 'pointer',
		_hover: { textDecoration: 'underline' },
	}),
	hint: css({
		fontSize: 'xs',
		color: 'fg.muted',
	}),
	footer: css({
		mt: '4',
	}),
}
