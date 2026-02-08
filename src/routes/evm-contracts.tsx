import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileCode2, CheckCircle, XCircle } from 'lucide-react'
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EvmNav } from '@/components/common/evm-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddressChip } from '@/components/AddressChip'
import { DataTable } from '@/components/ui/data-table'
import { api } from '@/lib/api'
import { css } from '@/styled-system/css'

// -- Contract type from API response --

interface EvmContract {
	address: string
	creator: string | null
	creation_tx: string | null
	bytecode_hash: string | null
	name: string | null
	is_verified: boolean
	creation_height: number
}

// -- Column definitions --

const columnHelper = createColumnHelper<EvmContract>()

const contractColumns: ColumnDef<EvmContract, any>[] = [
	columnHelper.accessor('address', {
		header: 'Address',
		enableSorting: false,
		cell: ({ getValue }) => <AddressChip address={getValue()} />,
	}),
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() || <span className={css({ color: 'fg.muted' })}>Unknown</span>,
	}),
	columnHelper.accessor('creator', {
		header: 'Creator',
		enableSorting: false,
		cell: ({ getValue }) => {
			const creator = getValue()
			return creator ? (
				<AddressChip address={creator} />
			) : (
				<span className={css({ color: 'fg.muted' })}>-</span>
			)
		},
	}),
	columnHelper.accessor('is_verified', {
		header: 'Verified',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<Badge variant="success">
					<CheckCircle className={css({ h: '3', w: '3', mr: '1' })} />
					Verified
				</Badge>
			) : (
				<Badge variant="secondary">
					<XCircle className={css({ h: '3', w: '3', mr: '1' })} />
					Unverified
				</Badge>
			),
	}),
	columnHelper.accessor('creation_height', {
		header: 'Created',
		enableSorting: false,
		cell: ({ getValue }) => (
			<div className={css({ fontSize: 'sm', fontFamily: 'mono' })}>
				Block #{getValue().toLocaleString()}
			</div>
		),
	}),
]

export default function EvmContractsPage() {
	const [page, setPage] = useState(0)
	const limit = 20

	const { data, isLoading, error } = useQuery({
		queryKey: ['evm-contracts', page],
		queryFn: () => api.getEvmContracts(limit, page * limit),
	})

	const hasData = data && data.length > 0

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
					<CardTitle>Deployed Contracts</CardTitle>
					<CardDescription>
						{hasData ? `Showing ${data.length} contracts` : 'No contracts deployed yet'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error ? (
						<div className={css(styles.emptyState)}>
							<FileCode2 className={css(styles.emptyIcon)} />
							<p>Error loading contracts</p>
						</div>
					) : !isLoading && !hasData ? (
						<div className={css(styles.emptyState)}>
							<FileCode2 className={css(styles.emptyIcon)} />
							<h3 className={css(styles.emptyTitle)}>No Contracts Yet</h3>
							<p className={css(styles.emptyText)}>
								No smart contracts have been deployed to this chain yet.
								Contracts will appear here once they are deployed.
							</p>
						</div>
					) : (
						<DataTable
							columns={contractColumns}
							data={data ?? []}
							isLoading={isLoading}
							hidePagination
							pageSize={data?.length || limit}
							getRowId={(contract) => contract.address}
						/>
					)}

					{hasData && data.length >= limit && (
						<div className={css(styles.pagination)}>
							<Button
								variant="outline"
								size="sm"
								disabled={page === 0}
								onClick={() => setPage(p => p - 1)}
							>
								Previous
							</Button>
							<span className={css(styles.pageInfo)}>Page {page + 1}</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage(p => p + 1)}
							>
								Next
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

const styles = {
	container: {
		display: 'flex',
		flexDirection: 'column',
		gap: '6',
		w: 'full',
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		w: 'full',
	},
	title: {
		fontSize: '3xl',
		fontWeight: 'bold',
	},
	subtitle: {
		color: 'fg.muted',
		marginTop: '1',
	},
	emptyState: {
		textAlign: 'center',
		py: '12',
		color: 'fg.muted',
	},
	emptyIcon: {
		height: '12',
		width: '12',
		margin: '0 auto',
		marginBottom: '4',
		opacity: '0.5',
	},
	emptyTitle: {
		fontSize: 'lg',
		fontWeight: 'semibold',
		color: 'fg.default',
		marginBottom: '2',
	},
	emptyText: {
		maxWidth: 'md',
		margin: '0 auto',
	},
	pagination: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '4',
		marginTop: '4',
	},
	pageInfo: {
		fontSize: 'sm',
		color: 'fg.muted',
	},
}
