/**
 * Claim Rewards Modal Component
 * Modal for claiming staking rewards from validators
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
import { Checkbox } from '@/components/ui/checkbox'
import { TransactionStatus } from './TransactionStatus'
import { useStaking } from '@/hooks/useStaking'
import { useWallet } from '@/contexts/WalletContext'
import { css } from '@/styled-system/css'

interface ValidatorReward {
	validatorAddress: string
	validatorMoniker?: string
	rewardAmount: string
}

interface ClaimRewardsModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	rewards: ValidatorReward[]
	totalRewards: string
}

export function ClaimRewardsModal({
	open,
	onOpenChange,
	rewards,
	totalRewards,
}: ClaimRewardsModalProps) {
	const [selectedValidators, setSelectedValidators] = useState<Set<string>>(new Set())
	const { isConnected, walletType } = useWallet()
	const { withdrawRewards, withdrawAllRewards, status, error, txHash, reset, isReady } = useStaking()

	useEffect(() => {
		if (!open) {
			setSelectedValidators(new Set())
			reset()
		} else {
			// Select all by default
			setSelectedValidators(new Set(rewards.map((r) => r.validatorAddress)))
		}
	}, [open, reset, rewards])

	const handleToggle = (validatorAddress: string) => {
		setSelectedValidators((prev) => {
			const next = new Set(prev)
			if (next.has(validatorAddress)) {
				next.delete(validatorAddress)
			} else {
				next.add(validatorAddress)
			}
			return next
		})
	}

	const handleToggleAll = () => {
		if (selectedValidators.size === rewards.length) {
			setSelectedValidators(new Set())
		} else {
			setSelectedValidators(new Set(rewards.map((r) => r.validatorAddress)))
		}
	}

	const handleSubmit = async () => {
		const validators = Array.from(selectedValidators)
		if (validators.length === 0) return

		if (validators.length === 1) {
			await withdrawRewards(validators[0])
		} else {
			await withdrawAllRewards(validators)
		}
	}

	const isLoading = status === 'pending'
	const canSubmit = isReady && selectedValidators.size > 0 && !isLoading

	const selectedRewardsTotal = rewards
		.filter((r) => selectedValidators.has(r.validatorAddress))
		.reduce((sum, r) => sum + parseFloat(r.rewardAmount || '0'), 0)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Claim Staking Rewards</DialogTitle>
					<DialogDescription>
						Select validators to claim rewards from
					</DialogDescription>
				</DialogHeader>

				{!isConnected ? (
					<div className={styles.notConnected}>
						<p>Please connect your wallet to claim rewards.</p>
					</div>
				) : (
					<div>
						<div className={styles.totalRewards}>
							<span className={styles.totalLabel}>Total Available</span>
							<span className={styles.totalAmount}>{totalRewards} RAI</span>
						</div>

						{rewards.length === 0 ? (
							<div className={styles.noRewards}>
								No rewards available to claim.
							</div>
						) : (
							<>
								<div className={styles.selectAllRow}>
									<Checkbox
										checked={selectedValidators.size === rewards.length}
										onCheckedChange={handleToggleAll}
									/>
									<span className={styles.selectAllLabel}>
										{selectedValidators.size === rewards.length ? 'Deselect All' : 'Select All'}
									</span>
								</div>

								<div className={styles.validatorList}>
									{rewards.map((reward) => (
										<div key={reward.validatorAddress} className={styles.validatorRow}>
											<Checkbox
												checked={selectedValidators.has(reward.validatorAddress)}
												onCheckedChange={() => handleToggle(reward.validatorAddress)}
											/>
											<div className={styles.validatorInfo}>
												<span className={styles.validatorName}>
													{reward.validatorMoniker || reward.validatorAddress.slice(0, 20) + '...'}
												</span>
												<span className={styles.rewardAmount}>{reward.rewardAmount} RAI</span>
											</div>
										</div>
									))}
								</div>

								{selectedValidators.size > 0 && (
									<div className={styles.selectedTotal}>
										Claiming: {selectedRewardsTotal.toFixed(6)} RAI from {selectedValidators.size}{' '}
										validator{selectedValidators.size > 1 ? 's' : ''}
									</div>
								)}
							</>
						)}

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
							<Button onClick={handleSubmit} disabled={!canSubmit}>
								{isLoading ? 'Claiming...' : 'Claim Rewards'}
							</Button>
						</DialogFooter>
					</div>
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
	noRewards: css({
		py: '6',
		textAlign: 'center',
		color: 'fg.muted',
	}),
	totalRewards: css({
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		mb: '4',
		p: '3',
		rounded: 'md',
		bg: 'accent.subtle',
		borderWidth: '1px',
		borderColor: 'accent.default',
	}),
	totalLabel: css({
		color: 'fg.muted',
		fontSize: 'sm',
	}),
	totalAmount: css({
		fontWeight: 'bold',
		fontSize: 'lg',
		color: 'accent.default',
	}),
	selectAllRow: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		pb: '2',
		borderBottomWidth: '1px',
		borderColor: 'border.default',
	}),
	selectAllLabel: css({
		fontSize: 'sm',
		color: 'fg.muted',
	}),
	validatorList: css({
		maxHeight: '200px',
		overflowY: 'auto',
		py: '2',
	}),
	validatorRow: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		py: '2',
		_hover: { bg: 'bg.subtle' },
		rounded: 'md',
		px: '1',
	}),
	validatorInfo: css({
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		flex: '1',
	}),
	validatorName: css({
		fontSize: 'sm',
	}),
	rewardAmount: css({
		fontSize: 'sm',
		color: 'fg.muted',
	}),
	selectedTotal: css({
		mt: '3',
		pt: '3',
		borderTopWidth: '1px',
		borderColor: 'border.default',
		fontSize: 'sm',
		color: 'fg.muted',
	}),
	footer: css({
		mt: '4',
	}),
}
