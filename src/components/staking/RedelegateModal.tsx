/**
 * Redelegate Modal Component
 * Modal for redelegating tokens from one validator to another
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
import { css } from '@/styled-system/css'

interface RedelegateModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	srcValidatorAddress: string
	srcValidatorMoniker?: string
	dstValidatorAddress: string
	dstValidatorMoniker?: string
	currentDelegation?: string
}

export function RedelegateModal({
	open,
	onOpenChange,
	srcValidatorAddress,
	srcValidatorMoniker,
	dstValidatorAddress,
	dstValidatorMoniker,
	currentDelegation,
}: RedelegateModalProps) {
	const [amount, setAmount] = useState('')
	const { isConnected } = useWallet()
	const { redelegate, status, error, txHash, reset, isReady } = useStaking()

	useEffect(() => {
		if (!open) {
			setAmount('')
			reset()
		}
	}, [open, reset])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!amount || parseFloat(amount) <= 0) return

		await redelegate(srcValidatorAddress, dstValidatorAddress, amount)
	}

	const handleMax = () => {
		if (currentDelegation) {
			setAmount(currentDelegation)
		}
	}

	const isLoading = status === 'pending'
	const canSubmit = isReady && amount && parseFloat(amount) > 0 && !isLoading

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Redelegate RAI</DialogTitle>
					<DialogDescription>
						Move stake from {srcValidatorMoniker || srcValidatorAddress} to{' '}
						{dstValidatorMoniker || dstValidatorAddress}
					</DialogDescription>
				</DialogHeader>

				{!isConnected ? (
					<div className={styles.notConnected}>
						<p>Please connect your wallet to redelegate tokens.</p>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						<div className={styles.info}>
							<div className={styles.infoRow}>
								<span className={styles.infoLabel}>From:</span>
								<span>{srcValidatorMoniker || srcValidatorAddress}</span>
							</div>
							<div className={styles.infoRow}>
								<span className={styles.infoLabel}>To:</span>
								<span>{dstValidatorMoniker || dstValidatorAddress}</span>
							</div>
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
								Redelegation is instant but you cannot redelegate the same tokens again for 21 days.
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
								{isLoading ? 'Redelegating...' : 'Redelegate'}
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
	info: css({
		mb: '4',
		p: '3',
		rounded: 'md',
		bg: 'bg.subtle',
		fontSize: 'sm',
	}),
	infoRow: css({
		display: 'flex',
		gap: '2',
		py: '1',
	}),
	infoLabel: css({
		color: 'fg.muted',
		minWidth: '50px',
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
