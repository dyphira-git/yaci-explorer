import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Shield } from "lucide-react"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
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
import { api } from "@/lib/api"
import { formatAddress } from "@/lib/utils"
import { formatDenomAmount } from "@/lib/denom"
import { getChainInfo } from "@/lib/chain-info"
import { css } from "@/styled-system/css"

type SortField = "tokens" | "moniker" | "commission" | "status" | "delegators"
type SortDir = "asc" | "desc"

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

export default function ValidatorsPage() {
	const [page, setPage] = useState(0)
	const [sortBy, setSortBy] = useState<SortField>("tokens")
	const [sortDir, setSortDir] = useState<SortDir>("desc")
	const [statusFilter, setStatusFilter] = useState<string | undefined>()
	const [search, setSearch] = useState("")
	const limit = 20

	const { data: stats, isLoading: statsLoading } = useQuery({
		queryKey: ["validator-stats"],
		queryFn: () => api.getValidatorStats(),
		staleTime: 30000,
	})

	const { data: chainInfo } = useQuery({
		queryKey: ["chain-info"],
		queryFn: () => getChainInfo(api),
		staleTime: Infinity,
	})

	const { data: validatorsData, isLoading: validatorsLoading } = useQuery({
		queryKey: ["validators", page, sortBy, sortDir, statusFilter, search],
		queryFn: () =>
			api.getValidatorsPaginated(limit, page * limit, {
				sortBy,
				sortDir,
				status: statusFilter,
				search: search || undefined,
			}),
		staleTime: 15000,
	})

	/** Toggles sort direction or sets a new sort field */
	function handleSort(field: SortField) {
		if (sortBy === field) {
			setSortDir(d => (d === "desc" ? "asc" : "desc"))
		} else {
			setSortBy(field)
			setSortDir("desc")
		}
		setPage(0)
	}

	/** Renders a sort indicator arrow */
	function sortIndicator(field: SortField) {
		if (sortBy !== field) return null
		return sortDir === "desc" ? " \u2193" : " \u2191"
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

			{/* Filters */}
			<div className={css(styles.filterRow)}>
				<input
					type="text"
					placeholder="Search by moniker or address..."
					value={search}
					onChange={(e) => {
						setSearch(e.target.value)
						setPage(0)
					}}
					className={css(styles.searchInput)}
				/>
				<select
					value={statusFilter || ""}
					onChange={(e) => {
						setStatusFilter(e.target.value || undefined)
						setPage(0)
					}}
					className={css(styles.filterSelect)}
				>
					<option value="">All Statuses</option>
					<option value="BOND_STATUS_BONDED">Active</option>
					<option value="BOND_STATUS_UNBONDING">Unbonding</option>
					<option value="BOND_STATUS_UNBONDED">Inactive</option>
				</select>
			</div>

			{/* Validators Table */}
			<Card>
				<CardHeader>
					<CardTitle>Validator Set</CardTitle>
					<CardDescription>
						{validatorsData?.pagination
							? `${validatorsData.pagination.total} validators`
							: "Loading..."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{validatorsLoading ? (
						<div className={css(styles.loadingContainer)}>
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className={css(styles.skeleton)} />
							))}
						</div>
					) : !validatorsData?.data?.length ? (
						<div className={css(styles.emptyState)}>
							<Shield className={css(styles.emptyIcon)} />
							<h3 className={css(styles.emptyTitle)}>No Validators</h3>
							<p className={css(styles.emptyText)}>
								No validators found matching your criteria.
							</p>
						</div>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className={css(styles.rankCol)}>Rank</TableHead>
										<TableHead
											className={css(styles.sortableHead)}
											onClick={() => handleSort("moniker")}
										>
											Moniker{sortIndicator("moniker")}
										</TableHead>
										<TableHead>Operator Address</TableHead>
										<TableHead
											className={css(styles.sortableHead)}
											onClick={() => handleSort("tokens")}
										>
											Voting Power{sortIndicator("tokens")}
										</TableHead>
										<TableHead
											className={css(styles.sortableHead)}
											onClick={() => handleSort("commission")}
										>
											Commission{sortIndicator("commission")}
										</TableHead>
										<TableHead
											className={css(styles.sortableHead)}
											onClick={() => handleSort("status")}
										>
											Status{sortIndicator("status")}
										</TableHead>
										<TableHead>IPFS</TableHead>
										<TableHead
											className={css(styles.sortableHead)}
											onClick={() => handleSort("delegators")}
										>
											Delegators{sortIndicator("delegators")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{validatorsData.data.map((v, idx) => (
										<TableRow key={v.operator_address}>
											<TableCell className={css(styles.rankCell)}>
												{page * limit + idx + 1}
											</TableCell>
											<TableCell>
												<Link
													to={`/validators/${v.operator_address}`}
													className={css(styles.monikerLink)}
												>
													{v.moniker || "Unknown"}
												</Link>
											</TableCell>
											<TableCell>
												<Link
													to={`/validators/${v.operator_address}`}
													className={css(styles.addressLink)}
												>
													{formatAddress(v.operator_address, 8)}
												</Link>
											</TableCell>
											<TableCell className={css(styles.monoText)}>
												{v.voting_power_pct?.toFixed(2)}%
											</TableCell>
											<TableCell className={css(styles.monoText)}>
												{formatCommission(v.commission_rate)}
											</TableCell>
											<TableCell>
												{validatorStatusBadge(v.status, v.jailed)}
											</TableCell>
											<TableCell className={css(styles.monoSmall)}>
												{v.ipfs_peer_id
													? `${v.ipfs_peer_id.slice(0, 16)}...`
													: "-"}
											</TableCell>
											<TableCell className={css(styles.monoText)}>
												{v.delegator_count}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							{validatorsData.pagination && (
								<div className={css(styles.pagination)}>
									<Button
										variant="outline"
										size="sm"
										disabled={!validatorsData.pagination.has_prev}
										onClick={() => setPage((p) => p - 1)}
									>
										Previous
									</Button>
									<span className={css(styles.pageInfo)}>
										Page {page + 1} of{" "}
										{Math.ceil(
											validatorsData.pagination.total / limit
										)}
									</span>
									<Button
										variant="outline"
										size="sm"
										disabled={!validatorsData.pagination.has_next}
										onClick={() => setPage((p) => p + 1)}
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
			md: "repeat(4, 1fr)",
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
	rankCol: {
		width: "60px",
	},
	rankCell: {
		fontFamily: "mono",
		fontSize: "sm",
		color: "fg.muted",
	},
	sortableHead: {
		cursor: "pointer",
		userSelect: "none",
		_hover: { color: "accent.default" },
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
	monoSmall: {
		fontFamily: "mono",
		fontSize: "xs",
	},
}
