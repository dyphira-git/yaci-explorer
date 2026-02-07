import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Cpu } from "lucide-react"
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/ui/data-table"
import { AddressChip } from "@/components/AddressChip"
import { api, type ComputeJob, type ComputeBenchmark } from "@/lib/api"
import { formatTimeAgo } from "@/lib/utils"
import { css } from "@/styled-system/css"

type TabId = "jobs" | "benchmarks"

/**
 * Returns the appropriate badge variant for a compute job/benchmark status
 */
function statusBadge(status: string) {
	switch (status) {
		case "COMPLETED":
			return <Badge variant="success">{status}</Badge>
		case "FAILED":
			return <Badge variant="destructive">{status}</Badge>
		default:
			return <Badge variant="outline">{status}</Badge>
	}
}

// -- Column definitions --

const jobHelper = createColumnHelper<ComputeJob>()

const jobColumns: ColumnDef<ComputeJob, any>[] = [
	jobHelper.accessor("job_id", {
		header: "Job ID",
		enableSorting: false,
		cell: ({ row }) => (
			<Link
				to={`/compute/${row.original.job_id}`}
				className={css(styles.idLink)}
			>
				#{row.original.job_id}
			</Link>
		),
	}),
	jobHelper.accessor("creator", {
		header: "Creator",
		enableSorting: false,
		cell: ({ row }) => <AddressChip address={row.original.creator} />,
	}),
	jobHelper.accessor("target_validator", {
		header: "Validator",
		enableSorting: false,
		cell: ({ row }) => (
			<AddressChip address={row.original.target_validator} />
		),
	}),
	jobHelper.accessor("status", {
		header: "Status",
		enableSorting: false,
		cell: ({ row }) => statusBadge(row.original.status),
	}),
	jobHelper.accessor("submit_time", {
		header: "Time",
		enableSorting: false,
		cell: ({ row }) => (
			<span className={css(styles.mutedText)}>
				{row.original.submit_time
					? formatTimeAgo(row.original.submit_time)
					: "-"}
			</span>
		),
	}),
]

const benchHelper = createColumnHelper<ComputeBenchmark>()

const benchmarkColumns: ColumnDef<ComputeBenchmark, any>[] = [
	benchHelper.accessor("benchmark_id", {
		header: "ID",
		enableSorting: false,
		cell: ({ row }) => (
			<span className={css(styles.monoText)}>
				#{row.original.benchmark_id}
			</span>
		),
	}),
	benchHelper.accessor("creator", {
		header: "Creator",
		enableSorting: false,
		cell: ({ row }) => <AddressChip address={row.original.creator} />,
	}),
	benchHelper.accessor("benchmark_type", {
		header: "Type",
		enableSorting: false,
		cell: ({ row }) =>
			row.original.benchmark_type || (
				<span className={css(styles.mutedText)}>-</span>
			),
	}),
	benchHelper.accessor("status", {
		header: "Status",
		enableSorting: false,
		cell: ({ row }) => statusBadge(row.original.status),
	}),
	benchHelper.accessor("submit_time", {
		header: "Time",
		enableSorting: false,
		cell: ({ row }) => (
			<span className={css(styles.mutedText)}>
				{row.original.submit_time
					? formatTimeAgo(row.original.submit_time)
					: "-"}
			</span>
		),
	}),
]

export default function ComputePage() {
	const [activeTab, setActiveTab] = useState<TabId>("jobs")
	const [jobPage, setJobPage] = useState(0)
	const [benchPage, setBenchPage] = useState(0)
	const [statusFilter, setStatusFilter] = useState<string | undefined>()
	const limit = 20

	const { data: stats, isLoading: statsLoading } = useQuery({
		queryKey: ["compute-stats"],
		queryFn: () => api.getComputeStats(),
		staleTime: 10000,
	})

	const { data: jobsData, isLoading: jobsLoading } = useQuery({
		queryKey: ["compute-jobs", jobPage, statusFilter],
		queryFn: () =>
			api.getComputeJobs(limit, jobPage * limit, {
				status: statusFilter,
			}),
		enabled: activeTab === "jobs",
		staleTime: 10000,
	})

	const { data: benchData, isLoading: benchLoading } = useQuery({
		queryKey: ["compute-benchmarks", benchPage, statusFilter],
		queryFn: () =>
			api.getComputeBenchmarks(limit, benchPage * limit, {
				status: statusFilter,
			}),
		enabled: activeTab === "benchmarks",
		staleTime: 10000,
	})

	return (
		<div className={css(styles.container)}>
			{/* Header */}
			<div className={css(styles.header)}>
				<div>
					<h1 className={css(styles.title)}>Compute</h1>
					<p className={css(styles.subtitle)}>
						Compute validation jobs and benchmarks
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
								<span className={css(styles.statLabel)}>Total Jobs</span>
								<span className={css(styles.statValue)}>
									{stats.total_jobs}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Pending</span>
								<span className={css(styles.statValuePending)}>
									{stats.pending_jobs}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Completed Jobs</span>
								<span className={css(styles.statValueSuccess)}>
									{stats.completed_jobs}
								</span>
							</CardContent>
						</Card>
						<Card>
							<CardContent className={css(styles.statCard)}>
								<span className={css(styles.statLabel)}>Benchmarks</span>
								<span className={css(styles.statValue)}>
									{stats.total_benchmarks}
								</span>
							</CardContent>
						</Card>
					</>
				) : null}
			</div>

			{/* Tabs */}
			<div className={css(styles.tabContainer)}>
				<button
					type="button"
					className={css(
						activeTab === "jobs" ? styles.tabActive : styles.tabInactive
					)}
					onClick={() => setActiveTab("jobs")}
				>
					Jobs
				</button>
				<button
					type="button"
					className={css(
						activeTab === "benchmarks" ? styles.tabActive : styles.tabInactive
					)}
					onClick={() => setActiveTab("benchmarks")}
				>
					Benchmarks
				</button>

				{/* Status filter */}
				<div className={css(styles.filterRight)}>
					<select
						value={statusFilter || ""}
						onChange={(e) => {
							setStatusFilter(e.target.value || undefined)
							setJobPage(0)
							setBenchPage(0)
						}}
						className={css(styles.filterSelect)}
					>
						<option value="">All Statuses</option>
						<option value="PENDING">Pending</option>
						<option value="COMPLETED">Completed</option>
						<option value="FAILED">Failed</option>
					</select>
				</div>
			</div>

			{/* Jobs Tab */}
			{activeTab === "jobs" && (
				<Card>
					<CardHeader>
						<CardTitle>Compute Jobs</CardTitle>
						<CardDescription>
							{jobsData?.pagination
								? `${jobsData.pagination.total} total jobs`
								: "Loading..."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!jobsLoading && !jobsData?.data?.length ? (
							<div className={css(styles.emptyState)}>
								<Cpu className={css(styles.emptyIcon)} />
								<h3 className={css(styles.emptyTitle)}>No Compute Jobs</h3>
								<p className={css(styles.emptyText)}>
									No compute jobs have been submitted yet.
								</p>
							</div>
						) : (
							<>
								<DataTable
									columns={jobColumns}
									data={jobsData?.data ?? []}
									isLoading={jobsLoading}
									getRowId={(row) => String(row.job_id)}
									hidePagination
								/>

								{jobsData?.pagination && (
									<div className={css(styles.pagination)}>
										<Button
											variant="outline"
											size="sm"
											disabled={!jobsData.pagination.has_prev}
											onClick={() => setJobPage((p) => p - 1)}
										>
											Previous
										</Button>
										<span className={css(styles.pageInfo)}>
											Page {jobPage + 1}
										</span>
										<Button
											variant="outline"
											size="sm"
											disabled={!jobsData.pagination.has_next}
											onClick={() => setJobPage((p) => p + 1)}
										>
											Next
										</Button>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			)}

			{/* Benchmarks Tab */}
			{activeTab === "benchmarks" && (
				<Card>
					<CardHeader>
						<CardTitle>Benchmarks</CardTitle>
						<CardDescription>
							{benchData?.pagination
								? `${benchData.pagination.total} total benchmarks`
								: "Loading..."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!benchLoading && !benchData?.data?.length ? (
							<div className={css(styles.emptyState)}>
								<Cpu className={css(styles.emptyIcon)} />
								<h3 className={css(styles.emptyTitle)}>No Benchmarks</h3>
								<p className={css(styles.emptyText)}>
									No benchmarks have been submitted yet.
								</p>
							</div>
						) : (
							<>
								<DataTable
									columns={benchmarkColumns}
									data={benchData?.data ?? []}
									isLoading={benchLoading}
									getRowId={(row) => String(row.benchmark_id)}
									hidePagination
								/>

								{benchData?.pagination && (
									<div className={css(styles.pagination)}>
										<Button
											variant="outline"
											size="sm"
											disabled={!benchData.pagination.has_prev}
											onClick={() => setBenchPage((p) => p - 1)}
										>
											Previous
										</Button>
										<span className={css(styles.pageInfo)}>
											Page {benchPage + 1}
										</span>
										<Button
											variant="outline"
											size="sm"
											disabled={!benchData.pagination.has_next}
											onClick={() => setBenchPage((p) => p + 1)}
										>
											Next
										</Button>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			)}
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
	statValuePending: {
		fontSize: "2xl",
		fontWeight: "bold",
		color: "yellow.500",
	},
	statValueSuccess: {
		fontSize: "2xl",
		fontWeight: "bold",
		color: "republicGreen.default",
	},
	tabContainer: {
		display: "flex",
		alignItems: "center",
		gap: "4",
		borderBottom: "1px solid",
		borderColor: "border.default",
		pb: "2",
	},
	tabActive: {
		fontSize: "sm",
		fontWeight: "semibold",
		color: "fg.default",
		borderBottom: "2px solid",
		borderColor: "accent.default",
		pb: "2",
		cursor: "pointer",
		bg: "transparent",
		border: "none",
		borderBottomWidth: "2px",
		borderBottomStyle: "solid",
		borderBottomColor: "accent.default",
	},
	tabInactive: {
		fontSize: "sm",
		fontWeight: "medium",
		color: "fg.muted",
		pb: "2",
		cursor: "pointer",
		bg: "transparent",
		border: "none",
		borderBottom: "2px solid transparent",
		_hover: { color: "fg.default" },
	},
	filterRight: {
		marginLeft: "auto",
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
	idLink: {
		fontFamily: "mono",
		fontSize: "sm",
		fontWeight: "semibold",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
	},
	monoText: {
		fontFamily: "mono",
		fontSize: "sm",
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
}
