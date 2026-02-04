/**
 * Delegations Page
 * Shows user's staking delegations and allows staking management
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Coins, ArrowRightLeft, Gift, Settings, ExternalLink, Wallet } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
	DelegateModal,
	UndelegateModal,
	RedelegateModal,
	ClaimRewardsModal,
	SetWithdrawAddressModal,
} from '@/components/staking'
import { useWallet } from '@/contexts/WalletContext'
import { api } from '@/lib/api'
import { formatDenomAmount } from '@/lib/denom'
import { css } from '@/styled-system/css'

interface DelegationAction {
	type: 'delegate' | 'undelegate' | 'redelegate' | 'claim' | 'withdraw-address'
	validatorAddress?: string
	validatorMoniker?: string
	currentDelegation?: string
}

export default function DelegationsPage() {
	const { isConnected, cosmosAddress, evmAddress, walletType, getDisplayAddress } = useWallet()
	const [action, setAction] = useState<DelegationAction | null>(null)

	// Fetch user's delegations
	const { data: delegations, isLoading: delegationsLoading } = useQuery({
		queryKey: ['delegator-delegations', cosmosAddress],
		queryFn: () => api.getDelegatorDelegations(cosmosAddress!),
		enabled: !!cosmosAddress,
		staleTime: 30000,
	})

	// Fetch user's delegation history
	const { data: history, isLoading: historyLoading } = useQuery({
		queryKey: ['delegator-history', cosmosAddress],
		queryFn: () => api.getDelegatorHistory(cosmosAddress!, 10),
		enabled: !!cosmosAddress,
		staleTime: 30000,
	})

	// Fetch user's stats
	const { data: stats } = useQuery({
		queryKey: ['delegator-stats', cosmosAddress],
		queryFn: () => api.getDelegatorStats(cosmosAddress!),
		enabled: !!cosmosAddress,
		staleTime: 60000,
	})

	// Fetch all validators for redelegate target selection
	const { data: validators } = useQuery({
		queryKey: ['validators'],
		queryFn: () => api.getValidators(),
		staleTime: 60000,
	})

	const handleOpenDelegate = (validatorAddress: string, moniker?: string) => {
		setAction({
			type: 'delegate',
			validatorAddress,
			validatorMoniker: moniker,
		})
	}

	const handleOpenUndelegate = (validatorAddress: string, moniker?: string, delegation?: string) => {
		setAction({
			type: 'undelegate',
			validatorAddress,
			validatorMoniker: moniker,
			currentDelegation: delegation,
		})
	}

	const handleCloseAction = () => setAction(null)

	if (!isConnected) {
		return (
			<div className={styles.page}>
				<Card>
					<CardContent className={styles.notConnected}>
						<Wallet className={styles.walletIcon} />
						<h2 className={styles.notConnectedTitle}>Connect Your Wallet</h2>
						<p className={styles.notConnectedDesc}>
							Connect your wallet to view and manage your staking delegations.
						</p>
						<p className={styles.notConnectedHint}>
							Click the wallet button in the header to connect via Keplr or an EVM wallet.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<div>
					<h1 className={styles.title}>My Staking</h1>
					<p className={styles.subtitle}>
						{getDisplayAddress()?.slice(0, 12)}...{getDisplayAddress()?.slice(-8)}
						<Badge variant="outline" className={styles.walletBadge}>
							{walletType === 'keplr' ? 'Keplr' : 'EVM'}
						</Badge>
					</p>
				</div>
				<div className={styles.headerActions}>
					<Button variant="outline" onClick={() => setAction({ type: 'withdraw-address' })}>
						<Settings className={styles.buttonIcon} />
						Withdraw Settings
					</Button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className={styles.statsGrid}>
				<Card>
					<CardHeader className={styles.statHeader}>
						<CardTitle className={styles.statTitle}>
							<Coins className={styles.statIcon} />
							Total Staked
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={styles.statValue}>
							{delegations?.total_staked
								? formatDenomAmount(delegations.total_staked, 'arai')
								: '0'}{' '}
							RAI
						</div>
						<div className={styles.statSubtext}>
							Across {delegations?.validator_count || 0} validator
							{delegations?.validator_count !== 1 ? 's' : ''}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className={styles.statHeader}>
						<CardTitle className={styles.statTitle}>
							<Gift className={styles.statIcon} />
							Pending Rewards
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={styles.statValue}>-- RAI</div>
						<Button
							size="sm"
							className={styles.claimButton}
							onClick={() => setAction({ type: 'claim' })}
							disabled
						>
							Claim All
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className={styles.statHeader}>
						<CardTitle className={styles.statTitle}>
							<ArrowRightLeft className={styles.statIcon} />
							Activity
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={styles.statValue}>{stats?.total_delegations || 0}</div>
						<div className={styles.statSubtext}>Total delegation events</div>
					</CardContent>
				</Card>
			</div>

			{/* Active Delegations */}
			<Card>
				<CardHeader>
					<CardTitle>Active Delegations</CardTitle>
					<CardDescription>Your current stake with validators</CardDescription>
				</CardHeader>
				<CardContent>
					{delegationsLoading ? (
						<div className={styles.loadingContainer}>
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className={styles.skeleton} />
							))}
						</div>
					) : !delegations?.delegations?.length ? (
						<div className={styles.emptyState}>
							<p>You don't have any active delegations.</p>
							<Link to="/validators">
								<Button>
									Browse Validators
									<ExternalLink className={styles.buttonIcon} />
								</Button>
							</Link>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Validator</TableHead>
									<TableHead className={styles.rightAlign}>Delegated</TableHead>
									<TableHead className={styles.rightAlign}>Commission</TableHead>
									<TableHead className={styles.rightAlign}>Status</TableHead>
									<TableHead className={styles.rightAlign}>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{delegations.delegations.map((d) => (
									<TableRow key={d.validator_address}>
										<TableCell>
											<Link
												to={`/validators/${d.validator_address}`}
												className={styles.validatorLink}
											>
												{d.validator_moniker || d.validator_address.slice(0, 16) + '...'}
											</Link>
										</TableCell>
										<TableCell className={styles.rightAlign}>
											{formatDenomAmount(d.total_delegated, 'arai')} RAI
										</TableCell>
										<TableCell className={styles.rightAlign}>
											{d.commission_rate
												? (parseFloat(d.commission_rate) * 100).toFixed(2) + '%'
												: '-'}
										</TableCell>
										<TableCell className={styles.rightAlign}>
											{d.validator_jailed ? (
												<Badge variant="destructive">Jailed</Badge>
											) : d.validator_status === 'BOND_STATUS_BONDED' ? (
												<Badge variant="success">Active</Badge>
											) : (
												<Badge variant="outline">Inactive</Badge>
											)}
										</TableCell>
										<TableCell className={styles.rightAlign}>
											<div className={styles.actionButtons}>
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														handleOpenDelegate(d.validator_address, d.validator_moniker || undefined)
													}
												>
													Delegate
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														handleOpenUndelegate(
															d.validator_address,
															d.validator_moniker || undefined,
															formatDenomAmount(d.total_delegated, 'arai')
														)
													}
												>
													Undelegate
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Recent Activity */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
					<CardDescription>Your latest staking transactions</CardDescription>
				</CardHeader>
				<CardContent>
					{historyLoading ? (
						<div className={styles.loadingContainer}>
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className={styles.skeleton} />
							))}
						</div>
					) : !history?.data?.length ? (
						<div className={styles.emptyState}>
							<p>No staking activity yet.</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Validator</TableHead>
									<TableHead className={styles.rightAlign}>Amount</TableHead>
									<TableHead className={styles.rightAlign}>Time</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.data.map((event) => (
									<TableRow key={event.id}>
										<TableCell>
											<Badge
												variant={
													event.event_type === 'DELEGATE'
														? 'default'
														: event.event_type === 'UNDELEGATE'
															? 'destructive'
															: 'outline'
												}
											>
												{event.event_type}
											</Badge>
										</TableCell>
										<TableCell>
											<Link
												to={`/validators/${event.validator_address}`}
												className={styles.validatorLink}
											>
												{event.validator_moniker ||
													event.validator_address.slice(0, 16) + '...'}
											</Link>
										</TableCell>
										<TableCell className={styles.rightAlign}>
											{event.amount ? formatDenomAmount(event.amount, event.denom || 'arai') : '-'} RAI
										</TableCell>
										<TableCell className={styles.rightAlign}>
											{event.timestamp
												? new Date(event.timestamp).toLocaleDateString()
												: '-'}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Modals */}
			{action?.type === 'delegate' && action.validatorAddress && (
				<DelegateModal
					open={true}
					onOpenChange={handleCloseAction}
					validatorAddress={action.validatorAddress}
					validatorMoniker={action.validatorMoniker}
				/>
			)}

			{action?.type === 'undelegate' && action.validatorAddress && (
				<UndelegateModal
					open={true}
					onOpenChange={handleCloseAction}
					validatorAddress={action.validatorAddress}
					validatorMoniker={action.validatorMoniker}
					currentDelegation={action.currentDelegation}
				/>
			)}

			{action?.type === 'claim' && (
				<ClaimRewardsModal
					open={true}
					onOpenChange={handleCloseAction}
					rewards={[]}
					totalRewards="0"
				/>
			)}

			{action?.type === 'withdraw-address' && (
				<SetWithdrawAddressModal open={true} onOpenChange={handleCloseAction} />
			)}
		</div>
	)
}

const styles = {
	page: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '6',
	}),
	header: css({
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		flexWrap: 'wrap',
		gap: '4',
	}),
	title: css({
		fontSize: '2xl',
		fontWeight: 'bold',
	}),
	subtitle: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		color: 'fg.muted',
		fontSize: 'sm',
		fontFamily: 'mono',
	}),
	walletBadge: css({
		ml: '2',
	}),
	headerActions: css({
		display: 'flex',
		gap: '2',
	}),
	statsGrid: css({
		display: 'grid',
		gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
		gap: '4',
	}),
	statHeader: css({
		pb: '2',
	}),
	statTitle: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		fontSize: 'sm',
		fontWeight: 'medium',
		color: 'fg.muted',
	}),
	statIcon: css({
		w: '4',
		h: '4',
	}),
	statValue: css({
		fontSize: 'xl',
		fontWeight: 'bold',
	}),
	statSubtext: css({
		fontSize: 'xs',
		color: 'fg.muted',
	}),
	claimButton: css({
		mt: '2',
	}),
	loadingContainer: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '2',
	}),
	skeleton: css({
		h: '12',
		w: 'full',
	}),
	emptyState: css({
		py: '8',
		textAlign: 'center',
		color: 'fg.muted',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '4',
	}),
	notConnected: css({
		py: '12',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '4',
		textAlign: 'center',
	}),
	walletIcon: css({
		w: '12',
		h: '12',
		color: 'fg.muted',
	}),
	notConnectedTitle: css({
		fontSize: 'xl',
		fontWeight: 'semibold',
	}),
	notConnectedDesc: css({
		color: 'fg.muted',
	}),
	notConnectedHint: css({
		fontSize: 'sm',
		color: 'fg.muted',
	}),
	rightAlign: css({
		textAlign: 'right',
	}),
	validatorLink: css({
		color: 'accent.default',
		_hover: { textDecoration: 'underline' },
	}),
	actionButtons: css({
		display: 'flex',
		gap: '2',
		justifyContent: 'flex-end',
	}),
	buttonIcon: css({
		w: '4',
		h: '4',
		mr: '1',
	}),
}
