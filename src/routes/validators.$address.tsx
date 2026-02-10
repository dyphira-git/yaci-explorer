import { useState, useEffect, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { ArrowLeft, Shield, Coins, Award, Activity } from "lucide-react"
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DelegateModal, UndelegateModal } from "@/components/staking"
import { useWallet } from "@/contexts/WalletContext"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AddressChip } from "@/components/AddressChip"
import { api, type DelegationEvent } from "@/lib/api"
import { getConfig } from "@/lib/env"
import { formatAddress, formatTimeAgo, fixBech32Address } from "@/lib/utils"
import { formatDenomAmount } from "@/lib/denom"
import { validatorToCosmosAddress } from "@/lib/address"
import { getChainInfo } from "@/lib/chain-info"
import { ValidatorSigningChart } from "@/components/analytics/ValidatorSigningChart"
import { css } from "@/styled-system/css"

/**
 * Returns a badge for validator bond status
 */
function validatorStatusBadge(status: string | null, jailed: boolean) {
	if (jailed) {
		return <Badge variant="destructive">Jailed</Badge>
	}
	switch (status) {
		case "BOND_STATUS_BONDED":
			return <Badge variant="success">Active</Badge>
		case "BOND_STATUS_UNBONDING":
			return <Badge variant="outline">Unbonding</Badge>
		case "BOND_STATUS_UNBONDED":
			return <Badge variant="outline">Inactive</Badge>
		default:
			return <Badge variant="outline">Unknown</Badge>
	}
}

/**
 * Returns a badge for delegation event type
 */
function eventTypeBadge(eventType: string) {
	switch (eventType) {
		case "DELEGATE":
			return <Badge variant="success">Delegate</Badge>
		case "UNDELEGATE":
			return <Badge variant="outline">Undelegate</Badge>
		case "REDELEGATE":
			return <Badge variant="outline">Redelegate</Badge>
		case "CREATE_VALIDATOR":
			return <Badge variant="success">Create</Badge>
		case "EDIT_VALIDATOR":
			return <Badge variant="outline">Edit</Badge>
		default:
			return <Badge variant="outline">{eventType}</Badge>
	}
}

/**
 * Formats a commission rate (stored as 0-1 decimal) as percentage.
 * Defensively handles leftover Cosmos SDK Dec format (10^18) values.
 */
function formatCommission(rate: number | null): string {
	if (rate === null || rate === undefined) return "-"
	let normalized = rate
	if (normalized > 1e6) normalized = normalized / 1e18
	const pct = normalized > 1 ? normalized : normalized * 100
	return `${pct.toFixed(2)}%`
}

const delegationColumnHelper = createColumnHelper<DelegationEvent>()

export default function ValidatorDetailPage() {
	const params = useParams()
	const address = params.address || ""
	const [eventPage, setEventPage] = useState(0)
	const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>()
	const [eventPageSize, setEventPageSize] = useState(20)
	const [showDelegateModal, setShowDelegateModal] = useState(false)
	const [showUndelegateModal, setShowUndelegateModal] = useState(false)
	const { isConnected } = useWallet()

	// Load chain info for proper denom display
	const { data: chainInfo } = useQuery({
		queryKey: ["chain-info"],
		queryFn: () => getChainInfo(api),
		staleTime: Infinity,
	})

	const baseDenom = chainInfo?.baseDenom || "unknown"
	const displayDenom = chainInfo?.displayDenom || "UNKNOWN"

	/** Column definitions for the delegation events DataTable */
	const delegationColumns: ColumnDef<DelegationEvent, any>[] = useMemo(
		() => [
			delegationColumnHelper.accessor("event_type", {
				header: "Type",
				enableSorting: false,
				cell: ({ getValue }) => eventTypeBadge(getValue()),
			}),
			delegationColumnHelper.accessor("delegator_address", {
				header: "Delegator",
				enableSorting: false,
				cell: ({ getValue }) => {
					const addr = getValue()
					return addr ? (
						<AddressChip address={fixBech32Address(addr) || addr} />
					) : (
						<span className={css(styles.mutedText)}>-</span>
					)
				},
			}),
			delegationColumnHelper.accessor("amount", {
				header: "Amount",
				enableSorting: false,
				cell: ({ row }) => (
					<span className={css(styles.monoSmall)}>
						{row.original.amount
							? `${formatDenomAmount(row.original.amount, row.original.denom || baseDenom, { maxDecimals: 2 })} ${displayDenom}`
							: "-"}
					</span>
				),
			}),
			delegationColumnHelper.accessor("tx_hash", {
				header: "Tx Hash",
				enableSorting: false,
				cell: ({ getValue }) => (
					<Link
						to={`/tx/${getValue()}`}
						className={css(styles.txLink)}
					>
						{formatAddress(getValue(), 6)}
					</Link>
				),
			}),
			delegationColumnHelper.accessor("timestamp", {
				header: "Time",
				enableSorting: false,
				cell: ({ getValue }) => (
					<span className={css(styles.mutedText)}>
						{getValue() ? formatTimeAgo(getValue()!) : "-"}
					</span>
				),
			}),
		],
		[baseDenom, displayDenom],
	)

	const refreshRequested = useRef(false)

	const {
		data: validator,
		isLoading,
		error,
		refetch: refetchValidator,
	} = useQuery({
		queryKey: ["validator-detail", address],
		queryFn: () => api.getValidatorDetail(address),
		enabled: !!address,
		staleTime: 15000,
	})

	// Request on-demand validator refresh if data is stale (>30s old)
	useEffect(() => {
		if (!validator?.operator_address || refreshRequested.current) return

		const updatedAt = new Date(validator.updated_at).getTime()
		const ageMs = Date.now() - updatedAt
		const STALE_THRESHOLD_MS = 30_000

		if (ageMs > STALE_THRESHOLD_MS) {
			refreshRequested.current = true
			const apiURL = getConfig().apiUrl

			fetch(`${apiURL}/rpc/request_validator_refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ _operator_address: validator.operator_address }),
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.success) {
						// Refetch after giving the refresh daemon time to update
						setTimeout(() => refetchValidator(), 3000)
					}
				})
				.catch(() => {
					// Silently fail -- user still sees cached data
				})
		}
	}, [validator, refetchValidator])

	const { data: eventsData, isLoading: eventsLoading } = useQuery({
		queryKey: ["delegation-events", address, eventPage, eventPageSize, eventTypeFilter],
		queryFn: () =>
			api.getDelegationEvents(
				address,
				eventPageSize,
				eventPage * eventPageSize,
				eventTypeFilter
			),
		enabled: !!address,
		staleTime: 15000,
	})

	// Performance metrics from block_results
	const { data: performance, isLoading: performanceLoading } = useQuery({
		queryKey: ["validator-performance", address],
		queryFn: () => api.getValidatorPerformance(address),
		enabled: !!address,
		staleTime: 60000,
		retry: 1,
	})

	// Lifetime rewards
	const { data: totalRewards, isLoading: rewardsLoading } = useQuery({
		queryKey: ["validator-total-rewards", address],
		queryFn: () => api.getValidatorTotalRewards(address),
		enabled: !!address,
		staleTime: 60000,
		retry: 1,
	})

	// Derive the wallet address from the operator address (same bytes, different bech32 prefix)
	const walletAddr = useMemo(() => {
		if (!validator?.operator_address) return null
		try {
			return validatorToCosmosAddress(validator.operator_address)
		} catch {
			return null
		}
	}, [validator?.operator_address])

	if (error) {
		return (
			<div className={css(styles.container)}>
				<Link to="/validators" className={css(styles.backLink)}>
					<ArrowLeft className={css(styles.backIcon)} />
					Back to Validators
				</Link>
				<Card>
					<CardContent className={css(styles.errorContent)}>
						<h2 className={css(styles.errorTitle)}>Validator Not Found</h2>
						<p className={css(styles.errorText)}>
							The requested validator could not be found.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (isLoading || !validator) {
		return (
			<div className={css(styles.container)}>
				<Skeleton className={css(styles.skeletonHeader)} />
				<Skeleton className={css(styles.skeletonBody)} />
			</div>
		)
	}

	return (
		<div className={css(styles.container)}>
			{/* Header */}
			<div>
				<Link to="/validators" className={css(styles.backLink)}>
					<ArrowLeft className={css(styles.backIcon)} />
					Back to Validators
				</Link>
				<div className={css(styles.titleRow)}>
					<Shield className={css(styles.titleIcon)} />
					<h1 className={css(styles.title)}>
						{validator.moniker || "Unknown Validator"}
					</h1>
					{validatorStatusBadge(validator.status, validator.jailed)}
				</div>
			</div>

			<div className={css(styles.grid)}>
				{/* Main column */}
				<div className={css(styles.mainColumn)}>
					{/* Validator Info */}
					<Card>
						<CardHeader>
							<CardTitle>Validator Info</CardTitle>
						</CardHeader>
						<CardContent>
							<div className={css(styles.infoGrid)}>
								<div className={css(styles.detailsGrid)}>
									<div className={css(styles.field)}>
										<label className={css(styles.fieldLabel)}>Moniker</label>
										<p className={css(styles.fieldValue)}>
											{validator.moniker || "-"}
										</p>
									</div>
									{validator.identity && (
										<div className={css(styles.field)}>
											<label className={css(styles.fieldLabel)}>Identity</label>
											<p className={css(styles.monoValue)}>{validator.identity}</p>
										</div>
									)}
									{validator.website && (
										<div className={css(styles.field)}>
											<label className={css(styles.fieldLabel)}>Website</label>
											<a
												href={
													validator.website.startsWith("http")
														? validator.website
														: `https://${validator.website}`
												}
												target="_blank"
												rel="noopener noreferrer"
												className={css(styles.websiteLink)}
											>
												{validator.website}
											</a>
										</div>
									)}
									{validator.details && (
										<div className={css(styles.field)}>
											<label className={css(styles.fieldLabel)}>Details</label>
											<p className={css(styles.fieldValue)}>{validator.details}</p>
										</div>
									)}
								</div>
								<div className={css(styles.addressesColumn)}>
									<div className={css(styles.addressRow)}>
										<label className={css(styles.fieldLabel)}>Operator</label>
										<AddressChip address={validator.operator_address} link={false} />
									</div>
									{walletAddr && (
										<div className={css(styles.addressRow)}>
											<label className={css(styles.fieldLabel)}>Wallet</label>
											<AddressChip address={walletAddr} />
										</div>
									)}
									{validator.consensus_address && (
										<div className={css(styles.addressRow)}>
											<label className={css(styles.fieldLabel)}>Consensus</label>
											<AddressChip address={validator.consensus_address} link={false} />
										</div>
									)}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Commission */}
					<Card>
						<CardHeader>
							<CardTitle>Commission</CardTitle>
						</CardHeader>
						<CardContent>
							<div className={css(styles.commissionGrid)}>
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>Rate</label>
									<p className={css(styles.fieldValueLarge)}>
										{formatCommission(validator.commission_rate)}
									</p>
								</div>
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>Max Rate</label>
									<p className={css(styles.fieldValue)}>
										{formatCommission(validator.commission_max_rate)}
									</p>
								</div>
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>Max Change</label>
									<p className={css(styles.fieldValue)}>
										{formatCommission(validator.commission_max_change_rate)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Signing History Chart */}
					<ValidatorSigningChart consensusAddress={validator.consensus_address} limit={200} />

					{/* Delegation Events */}
					<Card>
						<CardHeader>
							<div className={css(styles.eventsHeader)}>
								<CardTitle>Delegation Events</CardTitle>
								<select
									value={eventTypeFilter || ""}
									onChange={(e) => {
										setEventTypeFilter(e.target.value || undefined)
										setEventPage(0)
									}}
									className={css(styles.filterSelect)}
								>
									<option value="">All Types</option>
									<option value="DELEGATE">Delegate</option>
									<option value="UNDELEGATE">Undelegate</option>
									<option value="REDELEGATE">Redelegate</option>
									<option value="CREATE_VALIDATOR">Create Validator</option>
									<option value="EDIT_VALIDATOR">Edit Validator</option>
								</select>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={delegationColumns}
								data={eventsData?.data ?? []}
								isLoading={eventsLoading}
								getRowId={(row) => String(row.id)}
								emptyState="No delegation events found."
								maxHeight="none"
								totalRows={eventsData?.pagination?.total}
								currentPage={eventPage}
								onPageChange={setEventPage}
								pageSize={eventPageSize}
								onPageSizeChange={setEventPageSize}
							/>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className={css(styles.sidebar)}>
					{/* Staking Actions */}
					<Card>
						<CardHeader>
							<CardTitle className={css(styles.stakingTitle)}>
								<Coins className={css(styles.stakingIcon)} />
								Stake with this Validator
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className={css(styles.stakingActions)}>
								<Button
									onClick={() => setShowDelegateModal(true)}
									className={css(styles.stakingButton)}
								>
									Delegate
								</Button>
								<Button
									variant="outline"
									onClick={() => setShowUndelegateModal(true)}
									className={css(styles.stakingButton)}
								>
									Undelegate
								</Button>
							</div>
							{!isConnected && (
								<p className={css(styles.connectHint)}>
									Connect your wallet to stake
								</p>
							)}
						</CardContent>
					</Card>

					{/* Delegation Stats */}
					<Card>
						<CardHeader>
							<CardTitle>Delegation</CardTitle>
						</CardHeader>
						<CardContent>
							<div className={css(styles.sidebarFields)}>
								<div className={css(styles.sidebarRow)}>
									<span className={css(styles.sidebarLabel)}>Tokens</span>
									<span className={css(styles.sidebarValue)}>
										{validator.tokens !== null
											? `${formatDenomAmount(validator.tokens, baseDenom, { maxDecimals: 0 })} ${displayDenom}`
											: "-"}
									</span>
								</div>
								<div className={css(styles.sidebarRow)}>
									<span className={css(styles.sidebarLabel)}>Voting Power</span>
									<span className={css(styles.sidebarValue)}>
										{validator.voting_power_pct?.toFixed(2)}%
									</span>
								</div>
								<div className={css(styles.sidebarRow)}>
									<span className={css(styles.sidebarLabel)}>Delegators</span>
									<span className={css(styles.sidebarValue)}>
										{validator.delegator_count}
									</span>
								</div>
								{validator.min_self_delegation !== null && (
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>
											Min Self-Delegation
										</span>
										<span className={css(styles.sidebarValue)}>
											{formatDenomAmount(validator.min_self_delegation, baseDenom, { maxDecimals: 0 })} {displayDenom}
										</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Performance Metrics */}
					<Card>
						<CardHeader>
							<CardTitle className={css(styles.stakingTitle)}>
								<Activity className={css(styles.stakingIcon)} />
								Performance
							</CardTitle>
						</CardHeader>
						<CardContent>
							{performanceLoading ? (
								<div className={css(styles.loadingContainer)}>
									<Skeleton className={css(styles.skeleton)} />
								</div>
							) : performance ? (
								<div className={css(styles.sidebarFields)}>
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Uptime</span>
										<span className={css(styles.sidebarValue)} style={{
											color: performance.uptime_percentage >= 95 ? 'var(--colors-green-500)' :
												performance.uptime_percentage >= 80 ? 'var(--colors-yellow-500)' : 'var(--colors-red-500)'
										}}>
											{performance.uptime_percentage.toFixed(1)}%
										</span>
									</div>
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Blocks Signed</span>
										<span className={css(styles.sidebarValue)}>
											{performance.blocks_signed.toLocaleString()}
										</span>
									</div>
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Blocks Missed</span>
										<span className={css(styles.sidebarValue)} style={{
											color: performance.blocks_missed > 0 ? "var(--colors-yellow-500)" : "var(--colors-green-500)"
										}}>
											{performance.blocks_missed.toLocaleString()}
										</span>
									</div>
									{performance.total_jailing_events > 0 && (
										<div className={css(styles.sidebarRow)}>
											<span className={css(styles.sidebarLabel)}>Jailing Events</span>
											<span className={css(styles.sidebarValue)} style={{ color: "var(--colors-red-500)" }}>
												{performance.total_jailing_events}
											</span>
										</div>
									)}
									{performance.rewards_rank && (
										<div className={css(styles.sidebarRow)}>
											<span className={css(styles.sidebarLabel)}>Rewards Rank</span>
											<span className={css(styles.sidebarValue)}>
												#{performance.rewards_rank}
											</span>
										</div>
									)}
									{performance.delegation_rank && (
										<div className={css(styles.sidebarRow)}>
											<span className={css(styles.sidebarLabel)}>Delegation Rank</span>
											<span className={css(styles.sidebarValue)}>
												#{performance.delegation_rank}
											</span>
										</div>
									)}
								</div>
							) : (
								<p className={css(styles.mutedText)}>Performance data not available</p>
							)}
						</CardContent>
					</Card>

					{/* Lifetime Rewards */}
					<Card>
						<CardHeader>
							<CardTitle className={css(styles.stakingTitle)}>
								<Award className={css(styles.stakingIcon)} />
								Lifetime Earnings
							</CardTitle>
						</CardHeader>
						<CardContent>
							{rewardsLoading ? (
								<div className={css(styles.loadingContainer)}>
									<Skeleton className={css(styles.skeleton)} />
								</div>
							) : totalRewards ? (
								<div className={css(styles.sidebarFields)}>
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Total Rewards</span>
										<span className={css(styles.sidebarValue)}>
											{formatDenomAmount(totalRewards.total_rewards, baseDenom, { maxDecimals: 2 })} {displayDenom}
										</span>
									</div>
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Total Commission</span>
										<span className={css(styles.sidebarValue)}>
											{formatDenomAmount(totalRewards.total_commission, baseDenom, { maxDecimals: 2 })} {displayDenom}
										</span>
									</div>
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Active Blocks</span>
										<span className={css(styles.sidebarValue)}>
											{totalRewards.blocks_with_rewards.toLocaleString()}
										</span>
									</div>
								</div>
							) : (
								<p className={css(styles.mutedText)}>Rewards data not available</p>
							)}
						</CardContent>
					</Card>

					{/* Validator History - only show if there's data */}
					{(validator.creation_height || validator.first_seen_tx) && (
						<Card>
							<CardHeader>
								<CardTitle>Validator History</CardTitle>
							</CardHeader>
							<CardContent>
								<div className={css(styles.sidebarFields)}>
									{validator.creation_height && (
										<div className={css(styles.sidebarRow)}>
											<span className={css(styles.sidebarLabel)}>
												Creation Height
											</span>
											<Link
												to={`/blocks/${validator.creation_height}`}
												className={css(styles.txLink)}
											>
												#{validator.creation_height.toLocaleString()}
											</Link>
										</div>
									)}
									{validator.first_seen_tx && (
										<div className={css(styles.sidebarRow)}>
											<span className={css(styles.sidebarLabel)}>
												First Seen Tx
											</span>
											<Link
												to={`/tx/${validator.first_seen_tx}`}
												className={css(styles.txLink)}
											>
												{formatAddress(validator.first_seen_tx, 6)}
											</Link>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* IPFS Info */}
					{validator.ipfs_peer_id && (
						<Card>
							<CardHeader>
								<CardTitle>IPFS</CardTitle>
							</CardHeader>
							<CardContent>
								<div className={css(styles.sidebarFields)}>
									<div className={css(styles.field)}>
										<label className={css(styles.fieldLabel)}>
											Peer ID
										</label>
										<p className={css(styles.monoValueSmall)}>
											{validator.ipfs_peer_id}
										</p>
									</div>
									{validator.ipfs_multiaddrs && validator.ipfs_multiaddrs.length > 0 && (
										<div className={css(styles.field)}>
											<label className={css(styles.fieldLabel)}>
												Multiaddrs ({validator.ipfs_multiaddrs.length})
											</label>
											{validator.ipfs_multiaddrs.map((addr, i) => (
												<p key={i} className={css(styles.monoValueSmall)}>
													{addr}
												</p>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

				</div>
			</div>

			{/* Staking Modals */}
			<DelegateModal
				open={showDelegateModal}
				onOpenChange={setShowDelegateModal}
				validatorAddress={address}
				validatorMoniker={validator?.moniker || undefined}
			/>
			<UndelegateModal
				open={showUndelegateModal}
				onOpenChange={setShowUndelegateModal}
				validatorAddress={address}
				validatorMoniker={validator?.moniker || undefined}
			/>
		</div>
	)
}

const styles = {
	container: {
		display: "flex",
		flexDirection: "column",
		gap: "6",
		w: "full",
	},
	backLink: {
		display: "flex",
		alignItems: "center",
		gap: "2",
		color: "fg.muted",
		mb: "4",
		transition: "color 0.2s ease",
		_hover: { color: "accent.default" },
	},
	backIcon: {
		h: "4",
		w: "4",
	},
	titleRow: {
		display: "flex",
		alignItems: "center",
		gap: "3",
	},
	titleIcon: {
		h: "6",
		w: "6",
		color: "accent.default",
	},
	title: {
		fontSize: "2xl",
		fontWeight: "bold",
	},
	grid: {
		display: "grid",
		gap: "6",
		gridTemplateColumns: { base: "1fr", lg: "2fr 1fr" },
	},
	mainColumn: {
		display: "flex",
		flexDirection: "column",
		gap: "6",
	},
	infoGrid: {
		display: "grid",
		gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
		gap: "4",
		alignItems: "start",
	},
	detailsGrid: {
		display: "flex",
		flexDirection: "column",
		gap: "4",
	},
	addressesColumn: {
		display: "flex",
		flexDirection: "column",
		gap: "2",
	},
	addressRow: {
		display: "flex",
		flexDirection: "column",
		gap: "0.5",
	},
	commissionGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gap: "4",
	},
	field: {
		display: "flex",
		flexDirection: "column",
		gap: "1",
	},
	fieldLabel: {
		fontSize: "xs",
		fontWeight: "medium",
		color: "fg.muted",
		textTransform: "uppercase",
		letterSpacing: "wider",
	},
	fieldValue: {
		fontSize: "sm",
	},
	fieldValueLarge: {
		fontSize: "lg",
		fontWeight: "semibold",
	},
	monoValue: {
		fontSize: "sm",
		fontFamily: "mono",
		wordBreak: "break-all",
	},
	monoValueSmall: {
		fontSize: "xs",
		fontFamily: "mono",
		wordBreak: "break-all",
	},
	monoSmall: {
		fontFamily: "mono",
		fontSize: "xs",
	},
	websiteLink: {
		fontSize: "sm",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
	},
	eventsHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	filterSelect: {
		fontSize: "sm",
		bg: "bg.muted",
		border: "1px solid",
		borderColor: "border.default",
		rounded: "md",
		px: "3",
		py: "1.5",
		color: "fg.default",
	},
	loadingContainer: {
		display: "flex",
		flexDirection: "column",
		gap: "3",
	},
	skeleton: {
		height: "12",
		width: "full",
	},
	addressLink: {
		fontFamily: "mono",
		fontSize: "xs",
		_hover: { color: "accent.default" },
	},
	txLink: {
		fontFamily: "mono",
		fontSize: "sm",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
	},
	mutedText: {
		color: "fg.muted",
		fontSize: "sm",
	},
	sidebar: {
		display: "flex",
		flexDirection: "column",
		gap: "6",
	},
	sidebarFields: {
		display: "flex",
		flexDirection: "column",
		gap: "3",
	},
	sidebarRow: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
	},
	sidebarLabel: {
		color: "fg.muted",
		fontSize: "sm",
	},
	sidebarValue: {
		fontSize: "sm",
		fontWeight: "medium",
	},
	errorContent: {
		pt: "6",
		textAlign: "center",
		py: "12",
	},
	errorTitle: {
		fontSize: "xl",
		fontWeight: "bold",
		color: "red.600",
		mb: "2",
	},
	errorText: {
		color: "fg.muted",
	},
	skeletonHeader: {
		height: "8",
		width: "48",
	},
	skeletonBody: {
		height: "64",
		width: "full",
	},
	stakingTitle: {
		display: "flex",
		alignItems: "center",
		gap: "2",
	},
	stakingIcon: {
		h: "4",
		w: "4",
		color: "accent.default",
	},
	stakingActions: {
		display: "flex",
		flexDirection: "column",
		gap: "2",
	},
	stakingButton: {
		w: "full",
	},
	connectHint: {
		fontSize: "xs",
		color: "fg.muted",
		textAlign: "center",
		mt: "2",
	},
}
