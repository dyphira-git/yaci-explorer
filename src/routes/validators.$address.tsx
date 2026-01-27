import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { ArrowLeft, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AddressChip } from "@/components/AddressChip"
import { api } from "@/lib/api"
import { formatAddress, formatTimeAgo, formatNumber, fixBech32Address } from "@/lib/utils"
import { formatDenomAmount } from "@/lib/denom"
import { getChainBaseDenom, getChainDisplayDenom } from "@/lib/chain-info"
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

export default function ValidatorDetailPage() {
	const params = useParams()
	const address = params.address || ""
	const [eventPage, setEventPage] = useState(0)
	const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>()
	const eventLimit = 20

	const {
		data: validator,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["validator-detail", address],
		queryFn: () => api.getValidatorDetail(address),
		enabled: !!address,
		staleTime: 15000,
	})

	const { data: eventsData, isLoading: eventsLoading } = useQuery({
		queryKey: ["delegation-events", address, eventPage, eventTypeFilter],
		queryFn: () =>
			api.getDelegationEvents(
				address,
				eventLimit,
				eventPage * eventLimit,
				eventTypeFilter
			),
		enabled: !!address,
		staleTime: 15000,
	})

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
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>
										Operator Address
									</label>
									<AddressChip address={validator.operator_address} />
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
							{eventsLoading ? (
								<div className={css(styles.loadingContainer)}>
									{Array.from({ length: 3 }).map((_, i) => (
										<Skeleton key={i} className={css(styles.skeleton)} />
									))}
								</div>
							) : !eventsData?.data?.length ? (
								<p className={css(styles.mutedText)}>No delegation events found.</p>
							) : (
								<>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Type</TableHead>
												<TableHead>Delegator</TableHead>
												<TableHead>Amount</TableHead>
												<TableHead>Tx Hash</TableHead>
												<TableHead>Time</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{eventsData.data.map((event) => (
												<TableRow key={event.id}>
													<TableCell>
														{eventTypeBadge(event.event_type)}
													</TableCell>
													<TableCell>
														{event.delegator_address ? (() => {
														const addr = fixBech32Address(event.delegator_address) || event.delegator_address
														return (
															<Link
																to={`/addr/${addr}`}
																className={css(styles.addressLink)}
															>
																{formatAddress(addr, 6)}
															</Link>
														)
													})() : (
															<span className={css(styles.mutedText)}>-</span>
														)}
													</TableCell>
													<TableCell className={css(styles.monoSmall)}>
														{event.amount
															? `${formatDenomAmount(event.amount, event.denom || getChainBaseDenom(), { maxDecimals: 2 })} ${getChainDisplayDenom()}`
															: "-"}
													</TableCell>
													<TableCell>
														<Link
															to={`/tx/${event.tx_hash}`}
															className={css(styles.txLink)}
														>
															{formatAddress(event.tx_hash, 6)}
														</Link>
													</TableCell>
													<TableCell className={css(styles.mutedText)}>
														{event.timestamp
															? formatTimeAgo(event.timestamp)
															: "-"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>

									{eventsData.pagination && (
										<div className={css(styles.pagination)}>
											<Button
												variant="outline"
												size="sm"
												disabled={!eventsData.pagination.has_prev}
												onClick={() => setEventPage((p) => p - 1)}
											>
												Previous
											</Button>
											<span className={css(styles.pageInfo)}>
												Page {eventPage + 1}
											</span>
											<Button
												variant="outline"
												size="sm"
												disabled={!eventsData.pagination.has_next}
												onClick={() => setEventPage((p) => p + 1)}
											>
												Next
											</Button>
										</div>
									)}
								</>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className={css(styles.sidebar)}>
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
											? `${formatDenomAmount(validator.tokens, getChainBaseDenom(), { maxDecimals: 0 })} ${getChainDisplayDenom()}`
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
											{formatDenomAmount(validator.min_self_delegation, getChainBaseDenom(), { maxDecimals: 0 })} {getChainDisplayDenom()}
										</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Chain Info */}
					<Card>
						<CardHeader>
							<CardTitle>Chain Info</CardTitle>
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
								{validator.consensus_address && (
									<div className={css(styles.field)}>
										<label className={css(styles.fieldLabel)}>
											Consensus Address
										</label>
										<p className={css(styles.monoValueSmall)}>
											{validator.consensus_address}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

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
	detailsGrid: {
		display: "flex",
		flexDirection: "column",
		gap: "4",
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
	pagination: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "4",
		marginTop: "4",
	},
	pageInfo: {
		fontSize: "sm",
		color: "fg.muted",
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
}
