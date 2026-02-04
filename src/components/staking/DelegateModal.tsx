/**
 * Delegate Modal Component
 * Modal for delegating tokens to a validator
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

interface DelegateModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	validatorAddress: string
	validatorMoniker?: string
}

export function DelegateModal({
	open,
	onOpenChange,
	validatorAddress,
	validatorMoniker,
}: DelegateModalProps) {
	const [amount, setAmount] = useState('')
	const { isConnected, walletType, balance, isLoadingBalance, refreshBalance } = useWallet()
	const { delegate, status, error, txHash, reset, isReady } = useStaking()

	// Reset form when modal opens/closes, refresh balance when opening
	useEffect(() => {
		if (!open) {
			setAmount('')
			reset()
		} else {
			refreshBalance()
		}
	}, [open, reset, refreshBalance])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!amount || parseFloat(amount) <= 0) return

		await delegate(validatorAddress, amount)
	}

	const isLoading = status === 'pending'
	const canSubmit = isReady && amount && parseFloat(amount) > 0 && !isLoading

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delegate RAI</DialogTitle>
					<DialogDescription>
						Delegate tokens to {validatorMoniker || validatorAddress}
					</DialogDescription>
				</DialogHeader>

				{!isConnected ? (
					<div className={styles.notConnected}>
						<p>Please connect your wallet to delegate tokens.</p>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						<div className={styles.formGroup}>
							<div className={styles.labelRow}>
								<Label htmlFor="amount">Amount (RAI)</Label>
								<span className={styles.balance}>
									Available: {isLoadingBalance ? 'Loading...' : balance ? `${balance} RAI` : '0 RAI'}
								</span>
							</div>
							<div className={styles.inputRow}>
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
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => balance && setAmount(balance)}
									disabled={isLoading || !balance}
									className={styles.maxButton}
								>
									Max
								</Button>
							</div>
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
							<Button type="submit" disabled={!canSubmit}>
								{isLoading ? 'Delegating...' : 'Delegate'}
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
	balance: css({
		fontSize: 'sm',
		color: 'fg.muted',
	}),
	inputRow: css({
		display: 'flex',
		gap: '2',
	}),
	maxButton: css({
		flexShrink: 0,
	}),
	hint: css({
		fontSize: 'xs',
		color: 'fg.muted',
	}),
	footer: css({
		mt: '4',
	}),
}
