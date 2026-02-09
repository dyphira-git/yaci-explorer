import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Coins } from "lucide-react"
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EvmNav } from "@/components/common/evm-nav"
import { Badge } from "@/components/ui/badge"
import { AddressChip } from "@/components/AddressChip"
import { DataTable } from "@/components/ui/data-table"
import { api } from "@/lib/api"
import { formatNumber } from "@/lib/utils"
import { css } from "@/styled-system/css"

/** Token row shape returned by the API */
interface EvmToken {
	address: string
	name: string | null
	symbol: string | null
	decimals: number | null
	total_supply: string | null
	type: string | null
	first_seen_height: number | null
}

/**
 * Formats a raw token type string into a display-friendly label.
 * @param type - Raw token type (e.g. "ERC20", "ERC721", "ERC1155")
 * @returns Formatted type string
 */
const formatTokenType = (type: string | null) => {
	if (!type) return "Unknown"
	switch (type.toUpperCase()) {
		case "ERC20":
			return "ERC-20"
		case "ERC721":
			return "ERC-721 (NFT)"
		case "ERC1155":
			return "ERC-1155"
		default:
			return type
	}
}

/**
 * Formats a raw total supply bigint string with decimal normalization.
 * @param supply - Raw total supply as a string (may be very large)
 * @param decimals - Token decimal places (defaults to 18 if null)
 * @returns Formatted supply string or "-" if unavailable
 */
const formatSupply = (supply: string | null, decimals: number | null) => {
	if (!supply) return "-"
	try {
		const dec = decimals || 18
		const value = BigInt(supply)
		const divisor = BigInt(10 ** dec)
		const whole = value / divisor
		return formatNumber(whole.toString())
	} catch {
		return supply
	}
}

// -- Column definitions --

const columnHelper = createColumnHelper<EvmToken>()

const tokenColumns: ColumnDef<EvmToken, any>[] = [
	columnHelper.accessor("name", {
		header: "Token",
		enableSorting: false,
		cell: ({ row }) => (
			<div className={css(styles.tokenInfo)}>
				<Coins className={css(styles.tokenIcon)} />
				<div>
					<div className={css(styles.tokenName)}>
						{row.original.name || "Unknown Token"}
					</div>
					{row.original.symbol && (
						<div className={css(styles.tokenSymbol)}>
							{row.original.symbol}
						</div>
					)}
				</div>
			</div>
		),
	}),
	columnHelper.accessor("address", {
		header: "Address",
		enableSorting: false,
		cell: ({ row }) => <AddressChip address={row.original.address} />,
	}),
	columnHelper.accessor("type", {
		header: "Type",
		enableSorting: false,
		cell: ({ getValue }) => (
			<Badge variant="secondary">{formatTokenType(getValue())}</Badge>
		),
	}),
	columnHelper.accessor("total_supply", {
		header: "Total Supply",
		enableSorting: false,
		cell: ({ row }) => (
			<div className={css(styles.supplyInfo)}>
				<span className={css({ fontFamily: "mono", fontSize: "sm" })}>
					{formatSupply(row.original.total_supply, row.original.decimals)}
				</span>
				{row.original.decimals !== null && (
					<span className={css(styles.decimals)}>
						({row.original.decimals} decimals)
					</span>
				)}
			</div>
		),
	}),
	columnHelper.accessor("first_seen_height", {
		header: "First Seen",
		enableSorting: false,
		cell: ({ getValue }) => {
			const height = getValue()
			return height ? (
				<Link to={`/blocks/${height}`} className={css(styles.blockLink)}>
					#{formatNumber(height.toString())}
				</Link>
			) : (
				<span className={css(styles.muted)}>-</span>
			)
		},
	}),
]

export default function EvmTokensPage() {
	const [page, setPage] = useState(0)
	const [pageSize, setPageSize] = useState(20)

	const { data, isLoading, error } = useQuery({
		queryKey: ["evm-tokens", page, pageSize],
		queryFn: () => api.getEvmTokens(pageSize, page * pageSize),
	})

	const hasData = data && data.length > 0

	// Estimate total rows for pagination (API doesn't return count)
	const estimatedTotal = data
		? (data.length < pageSize
			? page * pageSize + data.length
			: (page + 1) * pageSize + 1)
		: 0

	return (
		<div className={css(styles.container)}>
			<div className={css(styles.header)}>
				<div>
					<h1 className={css(styles.title)}>EVM</h1>
					<p className={css(styles.subtitle)}>Smart contracts and tokens on the EVM</p>
				</div>
			</div>

			<EvmNav />

			<Card>
				<CardHeader>
					<CardTitle>Token Registry</CardTitle>
					<CardDescription>
						{hasData ? `Showing ${data.length} tokens` : "No tokens registered yet"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error ? (
						<div className={css(styles.emptyState)}>
							<Coins className={css(styles.emptyIcon)} />
							<p>Error loading tokens</p>
						</div>
					) : (
						<DataTable
							columns={tokenColumns}
							data={data ?? []}
							isLoading={isLoading}
							pageSize={pageSize}
							onPageSizeChange={(s) => {
								setPageSize(s)
								setPage(0)
							}}
							totalRows={estimatedTotal}
							currentPage={page}
							onPageChange={setPage}
							getRowId={(row) => row.address}
							emptyState={
								<div>
									<Coins className={css(styles.emptyIcon)} />
									<h3 className={css(styles.emptyTitle)}>No Tokens Yet</h3>
									<p className={css(styles.emptyText)}>
										No EVM tokens have been detected on this chain yet.
										Tokens will appear here once they are deployed and interacted with.
									</p>
								</div>
							}
						/>
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
	tokenInfo: {
		display: "flex",
		alignItems: "center",
		gap: "3",
	},
	tokenIcon: {
		height: "5",
		width: "5",
		color: "fg.muted",
	},
	tokenName: {
		fontWeight: "medium",
	},
	tokenSymbol: {
		fontSize: "xs",
		color: "fg.muted",
	},
	supplyInfo: {
		display: "flex",
		flexDirection: "column",
		gap: "0.5",
	},
	decimals: {
		fontSize: "xs",
		color: "fg.muted",
	},
	blockLink: {
		fontFamily: "mono",
		fontSize: "sm",
		_hover: { color: "accent.default" },
	},
	muted: {
		color: "fg.muted",
	},
}
