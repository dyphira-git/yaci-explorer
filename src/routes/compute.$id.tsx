import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { ArrowLeft, Cpu } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AddressChip } from "@/components/AddressChip"
import { api } from "@/lib/api"
import { formatTimeAgo, formatNativeFee } from "@/lib/utils"
import { css } from "@/styled-system/css"

/**
 * Returns the appropriate badge variant for a compute job status
 */
function statusBadge(status: string) {
	switch (status) {
		case "COMPLETED":
			return (
				<Badge variant="success" className={css(styles.statusBadge)}>
					{status}
				</Badge>
			)
		case "FAILED":
			return (
				<Badge variant="destructive" className={css(styles.statusBadge)}>
					{status}
				</Badge>
			)
		default:
			return (
				<Badge variant="outline" className={css(styles.statusBadge)}>
					{status}
				</Badge>
			)
	}
}

export default function ComputeJobDetailPage() {
	const params = useParams()
	const jobId = params.id ? Number(params.id) : undefined

	const {
		data: job,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["compute-job", jobId],
		queryFn: () => api.getComputeJob(jobId as number),
		enabled: jobId !== undefined && !Number.isNaN(jobId),
		staleTime: 10000,
	})

	if (error) {
		return (
			<div className={css(styles.container)}>
				<Link to="/compute" className={css(styles.backLink)}>
					<ArrowLeft className={css(styles.backIcon)} />
					Back to Compute
				</Link>
				<Card>
					<CardContent className={css(styles.errorContent)}>
						<h2 className={css(styles.errorTitle)}>Job Not Found</h2>
						<p className={css(styles.errorText)}>
							The requested compute job could not be found.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (isLoading || !job) {
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
				<Link to="/compute" className={css(styles.backLink)}>
					<ArrowLeft className={css(styles.backIcon)} />
					Back to Compute
				</Link>
				<div className={css(styles.titleRow)}>
					<Cpu className={css(styles.titleIcon)} />
					<h1 className={css(styles.title)}>Compute Job #{job.job_id}</h1>
					{statusBadge(job.status)}
				</div>
			</div>

			<div className={css(styles.grid)}>
				{/* Main Details */}
				<Card>
					<CardHeader>
						<CardTitle>Job Details</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={css(styles.detailsGrid)}>
							<div className={css(styles.field)}>
								<label className={css(styles.fieldLabel)}>Creator</label>
								<AddressChip address={job.creator} />
							</div>
							<div className={css(styles.field)}>
								<label className={css(styles.fieldLabel)}>
									Target Validator
								</label>
								<AddressChip address={job.target_validator} />
							</div>
							{job.execution_image && (
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>
										Execution Image
									</label>
									<p className={css(styles.monoValue)}>
										{job.execution_image}
									</p>
								</div>
							)}
							{job.verification_image && (
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>
										Verification Image
									</label>
									<p className={css(styles.monoValue)}>
										{job.verification_image}
									</p>
								</div>
							)}
							{job.result_upload_endpoint && (
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>
										Result Upload Endpoint
									</label>
									<p className={css(styles.monoValue)}>
										{job.result_upload_endpoint}
									</p>
								</div>
							)}
							{job.result_fetch_endpoint && (
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>
										Result Fetch Endpoint
									</label>
									<p className={css(styles.monoValue)}>
										{job.result_fetch_endpoint}
									</p>
								</div>
							)}
							{job.fee_amount && job.fee_denom && (
								<div className={css(styles.field)}>
									<label className={css(styles.fieldLabel)}>Fee</label>
									<p className={css(styles.fieldValue)}>
										{formatNativeFee(job.fee_amount, job.fee_denom)}
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Sidebar */}
				<div className={css(styles.sidebar)}>
					{/* Submission Info */}
					<Card>
						<CardHeader>
							<CardTitle>Submission</CardTitle>
						</CardHeader>
						<CardContent>
							<div className={css(styles.sidebarFields)}>
								<div className={css(styles.sidebarRow)}>
									<span className={css(styles.sidebarLabel)}>
										Transaction
									</span>
									<Link
										to={`/tx/${job.submit_tx_hash}`}
										className={css(styles.txLink)}
									>
										{job.submit_tx_hash.slice(0, 10)}...
									</Link>
								</div>
								{job.submit_height && (
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Block</span>
										<Link
											to={`/blocks/${job.submit_height}`}
											className={css(styles.txLink)}
										>
											#{job.submit_height.toLocaleString()}
										</Link>
									</div>
								)}
								{job.submit_time && (
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>Time</span>
										<span className={css(styles.sidebarValue)}>
											{formatTimeAgo(job.submit_time)}
										</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Result Info (if completed) */}
					{job.status === "COMPLETED" && job.result_tx_hash && (
						<Card>
							<CardHeader>
								<CardTitle>Result</CardTitle>
							</CardHeader>
							<CardContent>
								<div className={css(styles.sidebarFields)}>
									{job.result_hash && (
										<div className={css(styles.field)}>
											<label className={css(styles.fieldLabel)}>
												Result Hash
											</label>
											<p className={css(styles.monoValueSmall)}>
												{job.result_hash}
											</p>
										</div>
									)}
									<div className={css(styles.sidebarRow)}>
										<span className={css(styles.sidebarLabel)}>
											Transaction
										</span>
										<Link
											to={`/tx/${job.result_tx_hash}`}
											className={css(styles.txLink)}
										>
											{job.result_tx_hash.slice(0, 10)}...
										</Link>
									</div>
									{job.result_height && (
										<div className={css(styles.sidebarRow)}>
											<span className={css(styles.sidebarLabel)}>Block</span>
											<Link
												to={`/blocks/${job.result_height}`}
												className={css(styles.txLink)}
											>
												#{job.result_height.toLocaleString()}
											</Link>
										</div>
									)}
									{job.result_time && (
										<div className={css(styles.sidebarRow)}>
											<span className={css(styles.sidebarLabel)}>Time</span>
											<span className={css(styles.sidebarValue)}>
												{formatTimeAgo(job.result_time)}
											</span>
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
		color: "republicGreen.default",
	},
	title: {
		fontSize: "2xl",
		fontWeight: "bold",
	},
	statusBadge: {
		fontSize: "sm",
	},
	grid: {
		display: "grid",
		gap: "6",
		gridTemplateColumns: { base: "1fr", lg: "2fr 1fr" },
	},
	detailsGrid: {
		display: "flex",
		flexDirection: "column",
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
	txLink: {
		fontFamily: "mono",
		fontSize: "sm",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
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
