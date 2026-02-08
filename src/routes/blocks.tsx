import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Blocks, Filter, X } from 'lucide-react'
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/ui/data-table'
import { api, type BlockRaw } from '@/lib/api'
import { formatNumber, formatTimestamp, formatHash, formatTimeAgo } from '@/lib/utils'
import { css } from '@/styled-system/css'
import { hstack, grid } from '@/styled-system/patterns'

// -- Column definitions --

const columnHelper = createColumnHelper<BlockRaw>()

const blockColumns: ColumnDef<BlockRaw, any>[] = [
	columnHelper.accessor('id', {
		header: 'Height',
		enableSorting: false,
		cell: ({ row }) => (
			<Link
				to={`/blocks/${row.original.id}`}
				className={hstack({ gap: '2', fontWeight: 'medium', _hover: { color: 'accent.default' } })}
			>
				<Blocks className={css({ w: 'icon.sm', h: 'icon.sm' })} />
				{formatNumber(row.original.id)}
			</Link>
		),
	}),
	columnHelper.display({
		id: 'blockHash',
		header: 'Block Hash',
		enableSorting: false,
		cell: ({ row }) => (
			<code className={css({ fontSize: 'xs', fontFamily: 'mono', color: 'fg.muted' })}>
				{formatHash(row.original.data?.block_id?.hash || row.original.data?.blockId?.hash || '', 12)}
			</code>
		),
	}),
	columnHelper.display({
		id: 'time',
		header: 'Time',
		enableSorting: false,
		cell: ({ row }) => (
			<div>
				<div className={css({ fontSize: 'sm' })}>{formatTimeAgo(row.original.data.block.header.time)}</div>
				<div className={css({ fontSize: 'xs', color: 'fg.muted' })}>
					{formatTimestamp(row.original.data.block.header.time)}
				</div>
			</div>
		),
	}),
	columnHelper.display({
		id: 'transactions',
		header: 'Transactions',
		enableSorting: false,
		cell: ({ row }) => (
			<Badge variant="secondary">
				{String('tx_count' in row.original ? row.original.tx_count : (row.original.data?.txs?.length || 0))} txs
			</Badge>
		),
	}),
]

export default function BlocksPage() {
	const [page, setPage] = useState(0)
	const [pageSize, setPageSize] = useState(20)
	const [showFilters, setShowFilters] = useState(false)
	const [minTxCount, setMinTxCount] = useState<string>('')
	const [fromDate, setFromDate] = useState<string>('')
	const [toDate, setToDate] = useState<string>('')

	const hasActiveFilters = minTxCount || fromDate || toDate

	const { data, isLoading, error } = useQuery({
		queryKey: ['blocks', page, pageSize, minTxCount, fromDate, toDate],
		queryFn: () =>
			hasActiveFilters
				? api.getBlocksPaginated(pageSize, page * pageSize, {
					minTxCount: minTxCount ? parseInt(minTxCount, 10) : undefined,
					fromDate: fromDate || undefined,
					toDate: toDate || undefined,
				})
				: api.getBlocks(pageSize, page * pageSize),
	})

	const clearFilters = () => {
		setMinTxCount('')
		setFromDate('')
		setToDate('')
		setPage(0)
	}

	return (
		<div className={css({ display: 'flex', flexDirection: 'column', gap: '6', w: 'full' })}>
			<div className={hstack({ justify: 'space-between', w: 'full' })}>
				<h1 className={css({ fontSize: '3xl', fontWeight: 'bold' })}>Blocks</h1>
				<Button
					variant={showFilters ? 'default' : 'outline'}
					size="sm"
					onClick={() => setShowFilters(!showFilters)}
				>
					<Filter className={css({ w: 'icon.sm', h: 'icon.sm', mr: '2' })} />
					Filters
					{hasActiveFilters && <Badge variant="secondary" className={css({ ml: '2' })}>Active</Badge>}
				</Button>
			</div>

			{showFilters && (
				<Card>
					<CardHeader>
						<div className={hstack({ justify: 'space-between' })}>
							<CardTitle>Filter Blocks</CardTitle>
							{hasActiveFilters && (
								<Button variant="ghost" size="sm" onClick={clearFilters}>
									<X className={css({ w: 'icon.sm', h: 'icon.sm', mr: '1' })} />
									Clear
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<div className={grid({ columns: { base: 1, md: 3 }, gap: '4', w: 'full' })}>
							<div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
								<Label htmlFor="minTxCount">Minimum Transactions</Label>
								<Input
									id="minTxCount"
									type="number"
									min="0"
									placeholder="e.g., 1"
									value={minTxCount}
									onChange={(e) => {
										setMinTxCount(e.target.value)
										setPage(0)
									}}
								/>
							</div>
							<div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
								<Label htmlFor="fromDate">From Date</Label>
								<Input
									id="fromDate"
									type="datetime-local"
									value={fromDate}
									onChange={(e) => {
										setFromDate(e.target.value)
										setPage(0)
									}}
								/>
							</div>
							<div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
								<Label htmlFor="toDate">To Date</Label>
								<Input
									id="toDate"
									type="datetime-local"
									value={toDate}
									onChange={(e) => {
										setToDate(e.target.value)
										setPage(0)
									}}
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Recent Blocks</CardTitle>
					<CardDescription>
						Showing {data?.data.length || 0} blocks
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error ? (
						<div className={css({ textAlign: 'center', py: '12', color: 'fg.muted' })}>
							Error loading blocks
						</div>
					) : (
						<DataTable
							columns={blockColumns}
							data={data?.data ?? []}
							isLoading={isLoading}
							pageSize={pageSize}
							onPageSizeChange={(s) => {
								setPageSize(s)
								setPage(0)
							}}
							totalRows={data?.pagination.total}
							currentPage={page}
							onPageChange={setPage}
							getRowId={(block) => String(block.id)}
							emptyState="No blocks found"
						/>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
