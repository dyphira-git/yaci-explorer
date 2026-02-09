import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Shield, AlertTriangle, CheckCircle } from "lucide-react"
import { type ColumnDef, createColumnHelper, type SortingState } from "@tanstack/react-table"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/ui/data-table"
import { ValidatorAvatar } from "@/components/ValidatorAvatar"
import { api, type Validator } from "@/lib/api"
import { formatAddress, formatTimeAgo } from "@/lib/utils"
import { formatDenomAmount } from "@/lib/denom"
import { getChainInfo } from "@/lib/chain-info"
import { css } from "@/styled-system/css"

/** Checks if validator is active (bonded and not jailed) */
function isActiveValidator(v: Validator): boolean {
	return v.status === "BOND_STATUS_BONDED" && !v.jailed
}

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

/**
 * Returns color style for uptime percentage:
 * green (>=95%), yellow (>=80%), red (<80%)
 */
function getUptimeColor(pct: number | null): string {
	if (pct === null) return "fg.muted"
	if (pct >= 95) return "republicGreen.default"
	if (pct >= 80) return "yellow.500"
	return "red.500"
}

// -- Column definitions --

const columnHelper = createColumnHelper<Validator>()

const validatorColumns: ColumnDef<Validator, any>[] = [
	// Hidden sort column: active validators always first
	columnHelper.accessor((row) => (isActiveValidator(row) ? 0 : 1), {
		id: "_activeRank",
		header: "",
		enableHiding: true,
	}),
	columnHelper.display({
		id: "avatar",
		header: "",
		size: 48,
		enableSorting: false,
		cell: ({ row }) => (
			<ValidatorAvatar identity={row.original.identity} moniker={row.original.moniker} />
		),
	}),
	columnHelper.accessor("moniker", {
		header: "Moniker",
		cell: ({ row }) => (
			<Link
				to={`/validators/${row.original.operator_address}`}
				className={css(styles.monikerLink)}
			>
				{row.original.moniker || "Unknown"}
			</Link>
		),
		sortingFn: "alphanumeric",
	}),
	columnHelper.accessor("operator_address", {
		header: "Operator Address",
		enableSorting: false,
		cell: ({ row }) => (
			<Link
				to={`/validators/${row.original.operator_address}`}
				className={css(styles.addressLink)}
			>
				{formatAddress(row.original.operator_address, 8)}
			</Link>
		),
	}),
	columnHelper.accessor("voting_power_pct", {
		header: "Voting Power",
		cell: ({ getValue }) => (
			<span className={css(styles.monoText)}>{getValue()?.toFixed(2)}%</span>
		),
	}),
	columnHelper.accessor("commission_rate", {
		header: "Commission",
		cell: ({ getValue }) => (
			<span className={css(styles.monoText)}>{formatCommission(getValue())}</span>
		),
	}),
	columnHelper.accessor("status", {
		header: "Status",
		cell: ({ row }) => validatorStatusBadge(row.original.status, row.original.jailed),
	}),
	columnHelper.accessor("signing_percentage", {
		header: "Uptime",
		cell: ({ row }) => {
			const pct = row.original.signing_percentage
			return (
				<span
					className={css({
						fontFamily: "mono",
						fontSize: "sm",
						color: getUptimeColor(pct),
					})}
				>
					{pct != null ? `${pct.toFixed(1)}%` : "-"}
				</span>
			)
		},
	}),
	columnHelper.accessor("delegator_count", {
		header: "Delegators",
		cell: ({ getValue }) => <span className={css(styles.monoText)}>{getValue()}</span>,
	}),
]

function ValidatorEvents() {
	const { data: events, isLoading, error } = useQuery({
		queryKey: ["validator-events"],
		queryFn: () => api.getRecentValidatorEvents(["slash", "liveness", "jail"], 100, 0),
		staleTime: 30000,
		refetchInterval: 10_000,
		retry: 1,
	})

	if (isLoading) {
		return (
			<div className={css(styles.loadingContainer)}>
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className={css(styles.skeleton)} />
				))}
			</div>
		)
	}

	if (error) {
		return (
			<Card>
				<CardContent className={css(styles.eventsErrorCard)}>
					<AlertTriangle className={css(styles.eventsErrorIcon)} />
					<div className={css(styles.eventsErrorText)}>
						<div className={css(styles.eventsErrorTitle)}>
							Validator Events Not Available
						</div>
						<div className={css(styles.eventsErrorDesc)}>
							Block results extraction may not be enabled. Run yaci with
							--enable-block-results flag.
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (!events || events.length === 0) {
		return (
			<Card>
				<CardContent className={css(styles.eventsEmptyCard)}>
					<CheckCircle className={css(styles.eventsEmptyIcon)} />
					<div className={css(styles.eventsEmptyText)}>
						<div className={css(styles.eventsEmptyTitle)}>No Recent Events</div>
						<div className={css(styles.eventsEmptyDesc)}>
							No slashing or liveness events have occurred recently.
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Liveness Events</CardTitle>
				<CardDescription>
					Slashing, jailing, and liveness fault events from finalize_block_events
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className={css(styles.eventsList)}>
					{events.map((event, index) => {
						const displayName = event.moniker
							|| (event.validator_address ? `${formatAddress(event.validator_address, 10)}` : "Unknown")
						return (
						<div
							key={`${event.height}-${index}`}
							className={css(styles.eventItem)}
							style={{
								borderLeftColor: event.event_type === "slash" ? "var(--colors-red-500)" : "var(--colors-orange-500)",
							}}
						>
							<div className={css(styles.eventInfo)}>
								<div className={css(styles.eventHeader)}>
									<Badge variant={event.event_type === "slash" ? "destructive" : "outline"}>
										{event.event_type.toUpperCase()}
									</Badge>
									{event.operator_address ? (
										<Link
											to={`/validators/${event.operator_address}`}
											className={css(styles.eventMoniker)}
										>
											{displayName}
										</Link>
									) : (
										<span className={css(styles.eventMoniker)}>
											{displayName}
										</span>
									)}
								</div>
								<div className={css(styles.eventDetails)}>
									<div className={css(styles.eventReason)}>
										{formatEventReason(event.event_type, event.reason, event.attributes)}
									</div>
									<div className={css(styles.eventAddresses)}>
										{event.validator_address && (
											<>
												<span className={css(styles.eventAddressLabel)}>Consensus:</span>
												<code className={css(styles.eventAddressValue)}>
													{formatAddress(event.validator_address, 12)}
												</code>
											</>
										)}
										{event.power && (
											<>
												<span className={css(styles.eventAddressLabel)}>Power:</span>
												<span className={css(styles.eventAddressValue)}>{event.power}</span>
											</>
										)}
										{event.attributes?.missed_blocks_counter && (
											<>
												<span className={css(styles.eventAddressLabel)}>Missed:</span>
												<span className={css(styles.eventAddressValue)}>{event.attributes.missed_blocks_counter}</span>
											</>
										)}
									</div>
								</div>
							</div>
							<div className={css(styles.eventMeta)}>
								<Link
									to={`/blocks/${event.height}`}
									className={css(styles.eventBlockLink)}
								>
									Block #{event.height}
								</Link>
								<div className={css(styles.eventTime)}>
									{event.block_time
										? formatTimeAgo(event.block_time)
										: event.created_at
											? formatTimeAgo(event.created_at)
											: "-"}
								</div>
							</div>
						</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}

/**
 * Format event reason for better readability.
 * Falls back to extracting detail from event attributes if reason is empty.
 */
function formatEventReason(eventType: string, reason: string | null, attributes?: Record<string, string> | null): string {
	if (reason) {
		if (reason.includes("missing_signature")) return "Missed block signature (liveness fault)"
		if (reason.includes("double_sign")) return "Double signing detected"
		if (eventType === "jail") return `Jailed: ${reason}`
		if (eventType === "liveness") return `Liveness fault: ${reason}`
		return reason
	}
	if (attributes) {
		const missed = attributes.missed_blocks_counter
		const jailedUntil = attributes.jailed_until
		if (missed) return `Missed ${missed} blocks`
		if (jailedUntil) return `Jailed until ${jailedUntil}`
	}
	if (eventType === "liveness") return "Liveness fault detected"
	if (eventType === "jail") return "Validator jailed"
	if (eventType === "slash") return "Validator slashed"
	return "Event occurred"
}

export default function ValidatorsPage() {
	const [search, setSearch] = useState("")
	const [pageSize, setPageSize] = useState(20)
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "_activeRank", desc: false },
		{ id: "moniker", desc: true },
	])

	const { data: stats, isLoading: statsLoading } = useQuery({
		queryKey: ["validator-stats"],
		queryFn: () => api.getValidatorStats(),
		staleTime: 10_000,
		refetchInterval: 10_000,
	})

	const { data: chainInfo } = useQuery({
		queryKey: ["chain-info"],
		queryFn: () => getChainInfo(api),
		staleTime: Infinity,
	})

	const { data: validatorsData, isLoading: validatorsLoading } = useQuery({
		queryKey: ["validators-all", search],
		queryFn: () =>
			api.getValidatorsPaginated(500, 0, {
				sortBy: "moniker",
				sortDir: "asc",
				search: search || undefined,
			}),
		staleTime: 10_000,
		refetchInterval: 10_000,
	})

	const validators = useMemo(() => validatorsData?.data ?? [], [validatorsData])

	/** Always preserve _activeRank as the primary sort column */
	const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
		setSorting((prev) => {
			const next = typeof updater === "function" ? updater(prev) : updater
			// Strip _activeRank from user-driven changes, then prepend it
			const withoutRank = next.filter((s) => s.id !== "_activeRank")
			return [{ id: "_activeRank", desc: false }, ...withoutRank]
		})
	}

	return (
		<div className={css(styles.container)}>
			{/* Header */}
			<div className={css(styles.header)}>
				<div>
					<h1 className={css(styles.title)}>Validators</h1>
					<p className={css(styles.subtitle)}>
						Network validator set and delegation activity
					</p>
				</div>
			</div>

			{/* Stats */}
			<div className={css(styles.statsGrid)}>
				{statsLoading ? (
					Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className={css(styles.statSkeleton)} />
					))
				) : stats ? (
					<>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Total Validators</span>
								<span className={css(styles.statValue)}>
									{stats.total_validators}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Active</span>
								<span className={css(styles.statValueSuccess)}>
									{stats.active_validators}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Inactive</span>
								<span className={css(styles.statValueMuted)}>
									{stats.inactive_validators ?? (stats.total_validators - stats.active_validators - stats.jailed_validators)}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Jailed</span>
								<span className={css(styles.statValueDanger)}>
									{stats.jailed_validators}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Total Bonded</span>
								<span className={css(styles.statValue)}>
									{formatDenomAmount(stats.total_bonded_tokens, chainInfo?.baseDenom || 'arai', { maxDecimals: 0 })} {chainInfo?.displayDenom || 'RAI'}
								</span>
							</CardContent>
						</Card>
					</>
				) : null}
			</div>

			<Tabs defaultValue="validators" className={css(styles.tabs)}>
				<TabsList>
					<TabsTrigger value="validators">Validator Set</TabsTrigger>
					<TabsTrigger value="events">Liveness Events</TabsTrigger>
				</TabsList>

				<TabsContent value="validators" className={css(styles.tabContent)}>
					{/* Search Filter */}
					<div className={css(styles.filterRow)}>
						<input
							type="text"
							placeholder="Search by moniker or address..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className={css(styles.searchInput)}
						/>
					</div>

					{/* Validators Table */}
					<Card>
				<CardHeader>
					<CardTitle>Validator Set</CardTitle>
					<CardDescription>
						{validators.length > 0
							? `${validators.length} validators (active first)`
							: "Loading..."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={validatorColumns}
						data={validators}
						sorting={sorting}
						onSortingChange={handleSortingChange}
						columnVisibility={{ _activeRank: false }}
						pageSize={pageSize}
						onPageSizeChange={setPageSize}
						isLoading={validatorsLoading}
						getRowId={(v) => v.operator_address}
						emptyState={
							<div className={css(styles.emptyState)}>
								<Shield className={css(styles.emptyIcon)} />
								<h3 className={css(styles.emptyTitle)}>No Validators</h3>
								<p className={css(styles.emptyText)}>
									No validators found matching your criteria.
								</p>
							</div>
						}
					/>
				</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="events" className={css(styles.tabContent)}>
					<ValidatorEvents />
				</TabsContent>
			</Tabs>
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
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		w: "full",
	},
	title: {
		fontSize: "3xl",
		fontWeight: "bold",
	},
	subtitle: {
		color: "fg.muted",
		marginTop: "1",
	},
	statsGrid: {
		display: "grid",
		gridTemplateColumns: {
			base: "repeat(2, 1fr)",
			md: "repeat(5, 1fr)",
		},
		gap: "4",
	},
	statSkeleton: {
		height: "20",
		width: "full",
	},
	statCard: {
		display: "flex",
		flexDirection: "column",
		gap: "1",
		py: "4",
	},
	statLabel: {
		fontSize: "xs",
		fontWeight: "medium",
		color: "fg.muted",
		textTransform: "uppercase",
		letterSpacing: "wider",
	},
	statValue: {
		fontSize: "2xl",
		fontWeight: "bold",
	},
	statValueSuccess: {
		fontSize: "2xl",
		fontWeight: "bold",
		color: "republicGreen.default",
	},
	statValueDanger: {
		fontSize: "2xl",
		fontWeight: "bold",
		color: "red.500",
	},
	statValueMuted: {
		fontSize: "2xl",
		fontWeight: "bold",
		color: "fg.muted",
	},
	filterRow: {
		display: "flex",
		alignItems: "center",
		gap: "4",
		flexWrap: "wrap",
	},
	searchInput: {
		fontSize: "sm",
		bg: "bg.muted",
		border: "1px solid",
		borderColor: "border.default",
		rounded: "md",
		px: "3",
		py: "1.5",
		color: "fg.default",
		flex: "1",
		minWidth: "200px",
		maxWidth: "400px",
		outline: "none",
		_focus: { borderColor: "accent.default" },
		_placeholder: { color: "fg.muted" },
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
	emptyState: {
		textAlign: "center",
		py: "12",
		color: "fg.muted",
	},
	emptyIcon: {
		height: "12",
		width: "12",
		margin: "0 auto",
		marginBottom: "4",
		opacity: "0.5",
	},
	emptyTitle: {
		fontSize: "lg",
		fontWeight: "semibold",
		color: "fg.default",
		marginBottom: "2",
	},
	emptyText: {
		maxWidth: "md",
		margin: "0 auto",
	},
	monikerLink: {
		fontWeight: "semibold",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
	},
	addressLink: {
		fontFamily: "mono",
		fontSize: "xs",
		_hover: { color: "accent.default" },
	},
	monoText: {
		fontFamily: "mono",
		fontSize: "sm",
	},
	tabs: {
		width: "full",
	},
	tabContent: {
		display: "flex",
		flexDirection: "column",
		gap: "4",
		marginTop: "4",
	},
	eventsList: {
		display: "flex",
		flexDirection: "column",
		gap: "3",
	},
	eventItem: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "4",
		borderRadius: "md",
		bg: "bg.muted",
		borderLeft: "4px solid",
	},
	eventInfo: {
		display: "flex",
		flexDirection: "column",
		gap: "1",
	},
	eventHeader: {
		display: "flex",
		alignItems: "center",
		gap: "2",
	},
	eventMoniker: {
		fontWeight: "medium",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
	},
	eventReason: {
		fontSize: "sm",
		color: "fg.muted",
	},
	eventDetails: {
		display: "flex",
		flexDirection: "column",
		gap: "1",
		marginTop: "1",
	},
	eventAddresses: {
		display: "flex",
		alignItems: "center",
		gap: "2",
		fontSize: "xs",
		flexWrap: "wrap",
	},
	eventAddressLabel: {
		color: "fg.muted",
	},
	eventAddressValue: {
		fontFamily: "mono",
		color: "fg.subtle",
	},
	eventMeta: {
		textAlign: "right",
	},
	eventBlockLink: {
		fontSize: "sm",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
	},
	eventTime: {
		fontSize: "xs",
		color: "fg.muted",
	},
	eventsErrorCard: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "3",
		py: "8",
	},
	eventsErrorIcon: {
		height: "12",
		width: "12",
		color: "fg.muted",
	},
	eventsErrorText: {
		textAlign: "center",
	},
	eventsErrorTitle: {
		fontWeight: "medium",
		marginBottom: "1",
	},
	eventsErrorDesc: {
		fontSize: "sm",
		color: "fg.muted",
	},
	eventsEmptyCard: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "3",
		py: "8",
	},
	eventsEmptyIcon: {
		height: "12",
		width: "12",
		color: "republicGreen.default",
	},
	eventsEmptyText: {
		textAlign: "center",
	},
	eventsEmptyTitle: {
		fontWeight: "medium",
		marginBottom: "1",
	},
	eventsEmptyDesc: {
		fontSize: "sm",
		color: "fg.muted",
	},
}
