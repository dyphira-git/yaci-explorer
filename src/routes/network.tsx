import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Shield, Globe } from "lucide-react"
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
import { formatAddress, formatTimeAgo } from "@/lib/utils"
import { css } from "@/styled-system/css"

/**
 * Returns a styled badge for a slashing condition
 */
function conditionBadge(condition: string) {
	switch (condition) {
		case "COMPUTE_MISCONDUCT":
			return <Badge variant="destructive">Compute Misconduct</Badge>
		case "REPUTATION_DEGRADATION":
			return <Badge variant="secondary">Reputation Degradation</Badge>
		case "DELEGATED_COLLUSION":
			return <Badge variant="destructive">Delegated Collusion</Badge>
		default:
			return <Badge variant="outline">{condition}</Badge>
	}
}

export default function NetworkPage() {
	const [slashPage, setSlashPage] = useState(0)
	const [conditionFilter, setConditionFilter] = useState<string | undefined>()
	const limit = 20

	const { data: ipfsData, isLoading: ipfsLoading } = useQuery({
		queryKey: ["validator-ipfs"],
		queryFn: () => api.getValidatorIPFS(100, 0),
		staleTime: 30000,
	})

	const { data: slashData, isLoading: slashLoading } = useQuery({
		queryKey: ["slashing-records", slashPage, conditionFilter],
		queryFn: () =>
			api.getSlashingRecords(limit, slashPage * limit, {
				condition: conditionFilter,
			}),
		staleTime: 10000,
	})

	return (
		<div className={css(styles.container)}>
			{/* Header */}
			<div className={css(styles.header)}>
				<div>
					<h1 className={css(styles.title)}>Network</h1>
					<p className={css(styles.subtitle)}>
						Validator reputation and slashing records
					</p>
				</div>
			</div>

			{/* Validator IPFS Addresses */}
			<Card>
				<CardHeader>
					<CardTitle>
						<div className={css(styles.sectionTitle)}>
							<Globe className={css(styles.sectionIcon)} />
							Validator IPFS Addresses
						</div>
					</CardTitle>
					<CardDescription>
						{ipfsData
							? `${ipfsData.length} validators with IPFS addresses`
							: "Loading..."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{ipfsLoading ? (
						<div className={css(styles.loadingContainer)}>
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className={css(styles.skeleton)} />
							))}
						</div>
					) : !ipfsData?.length ? (
						<div className={css(styles.emptyState)}>
							<Globe className={css(styles.emptyIcon)} />
							<h3 className={css(styles.emptyTitle)}>
								No IPFS Addresses Registered
							</h3>
							<p className={css(styles.emptyText)}>
								No validators have registered IPFS addresses yet.
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Validator</TableHead>
									<TableHead>Peer ID</TableHead>
									<TableHead>Multiaddrs</TableHead>
									<TableHead>Last Updated</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{ipfsData.map((v) => (
									<TableRow key={v.validator_address}>
										<TableCell>
											<Link
												to={`/addr/${v.validator_address}`}
												className={css(styles.addressLink)}
											>
												{formatAddress(v.validator_address, 8)}
											</Link>
										</TableCell>
										<TableCell className={css(styles.monoSmall)}>
											{v.ipfs_peer_id
												? `${v.ipfs_peer_id.slice(0, 16)}...`
												: "-"}
										</TableCell>
										<TableCell>
											{v.ipfs_multiaddrs?.length ? (
												<Badge variant="outline">
													{v.ipfs_multiaddrs.length} addr
													{v.ipfs_multiaddrs.length !== 1 ? "s" : ""}
												</Badge>
											) : (
												<span className={css(styles.mutedText)}>-</span>
											)}
										</TableCell>
										<TableCell className={css(styles.mutedText)}>
											{v.timestamp ? formatTimeAgo(v.timestamp) : "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Slashing Records */}
			<Card>
				<CardHeader>
					<div className={css(styles.slashingHeader)}>
						<div>
							<CardTitle>
								<div className={css(styles.sectionTitle)}>
									<Shield className={css(styles.sectionIconRed)} />
									Slashing Records
								</div>
							</CardTitle>
							<CardDescription>
								{slashData?.pagination
									? `${slashData.pagination.total} total records`
									: "Loading..."}
							</CardDescription>
						</div>
						<select
							value={conditionFilter || ""}
							onChange={(e) => {
								setConditionFilter(e.target.value || undefined)
								setSlashPage(0)
							}}
							className={css(styles.filterSelect)}
						>
							<option value="">All Conditions</option>
							<option value="COMPUTE_MISCONDUCT">Compute Misconduct</option>
							<option value="REPUTATION_DEGRADATION">
								Reputation Degradation
							</option>
							<option value="DELEGATED_COLLUSION">Delegated Collusion</option>
						</select>
					</div>
				</CardHeader>
				<CardContent>
					{slashLoading ? (
						<div className={css(styles.loadingContainer)}>
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className={css(styles.skeleton)} />
							))}
						</div>
					) : !slashData?.data?.length ? (
						<div className={css(styles.emptyState)}>
							<Shield className={css(styles.emptyIcon)} />
							<h3 className={css(styles.emptyTitle)}>No Slashing Records</h3>
							<p className={css(styles.emptyText)}>
								No slashing evidence has been submitted yet.
							</p>
						</div>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Validator</TableHead>
										<TableHead>Condition</TableHead>
										<TableHead>Evidence Type</TableHead>
										<TableHead>Transaction</TableHead>
										<TableHead>Time</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{slashData.data.map((record) => (
										<TableRow key={record.id}>
											<TableCell>
												<Link
													to={`/addr/${record.validator_address}`}
													className={css(styles.addressLink)}
												>
													{formatAddress(record.validator_address, 6)}
												</Link>
											</TableCell>
											<TableCell>
												{conditionBadge(record.condition)}
											</TableCell>
											<TableCell className={css(styles.monoSmall)}>
												{record.evidence_type
													? record.evidence_type.split(".").pop()
													: "-"}
											</TableCell>
											<TableCell>
												<Link
													to={`/tx/${record.tx_hash}`}
													className={css(styles.txLink)}
												>
													{record.tx_hash.slice(0, 10)}...
												</Link>
											</TableCell>
											<TableCell className={css(styles.mutedText)}>
												{record.timestamp
													? formatTimeAgo(record.timestamp)
													: "-"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							{slashData.pagination && (
								<div className={css(styles.pagination)}>
									<Button
										variant="outline"
										size="sm"
										disabled={!slashData.pagination.has_prev}
										onClick={() => setSlashPage((p) => p - 1)}
									>
										Previous
									</Button>
									<span className={css(styles.pageInfo)}>
										Page {slashPage + 1}
									</span>
									<Button
										variant="outline"
										size="sm"
										disabled={!slashData.pagination.has_next}
										onClick={() => setSlashPage((p) => p + 1)}
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
	sectionTitle: {
		display: "flex",
		alignItems: "center",
		gap: "2",
	},
	sectionIcon: {
		h: "5",
		w: "5",
		color: "republicGreen.default",
	},
	sectionIconRed: {
		h: "5",
		w: "5",
		color: "red.500",
	},
	slashingHeader: {
		display: "flex",
		alignItems: "start",
		justifyContent: "space-between",
		gap: "4",
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
	addressLink: {
		fontFamily: "mono",
		fontSize: "xs",
		_hover: { color: "accent.default" },
	},
	monoSmall: {
		fontFamily: "mono",
		fontSize: "xs",
	},
	mutedText: {
		color: "fg.muted",
		fontSize: "sm",
	},
	txLink: {
		fontFamily: "mono",
		fontSize: "xs",
		color: "accent.default",
		_hover: { textDecoration: "underline" },
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
