/**
 * Contract Details Component
 * Shows detailed information about an EVM smart contract
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { FileCode, User, Hash, Clock, Activity, CheckCircle, XCircle, } from 'lucide-react'
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/ui/data-table'
import { api } from '@/lib/api'
import { formatHash, formatNumber, } from '@/lib/utils'
import { extractSelector, extractFunctionName, COMMON_SIGNATURES } from '@/lib/4byte'
import { css } from '@/styled-system/css'
import { hstack, grid } from '@/styled-system/patterns'

interface ContractDetailsProps {
	address: string
}

/** Shape of a single contract call row from the API */
interface ContractCall {
	tx_id: string
	hash: string
	from: string
	value: string
	gas_used: number | null
	status: number
	function_name: string | null
	function_signature: string | null
	data: string | null
}

// -- Column definitions for recent contract calls --

const columnHelper = createColumnHelper<ContractCall>()

const contractCallColumns: ColumnDef<ContractCall, any>[] = [
	columnHelper.accessor('hash', {
		header: 'Tx Hash',
		enableSorting: false,
		cell: ({ row }) => (
			<Link
				to={`/tx/${row.original.tx_id}`}
				className={css({ fontFamily: 'mono', fontSize: 'sm', color: 'chart.secondary', _hover: { color: 'accent.default' } })}
			>
				{formatHash(row.original.hash || row.original.tx_id, 8)}
			</Link>
		),
	}),
	columnHelper.accessor('from', {
		header: 'From',
		enableSorting: false,
		cell: ({ getValue }) => (
			<Link
				to={`/addr/${getValue()}`}
				className={css({ fontFamily: 'mono', fontSize: 'sm', color: 'chart.secondary', _hover: { color: 'accent.default' } })}
			>
				{formatHash(getValue(), 6)}
			</Link>
		),
	}),
	columnHelper.display({
		id: 'function',
		header: 'Function',
		cell: ({ row }) => {
			const call = row.original
			const selector = extractSelector(call.data)
			const functionDisplay = call.function_name ||
				(selector && COMMON_SIGNATURES[selector] ? extractFunctionName(COMMON_SIGNATURES[selector]) : null) ||
				selector ||
				'unknown'

			return (
				<>
					<span className={css({ fontFamily: 'mono', fontSize: 'sm' })}>
						{functionDisplay}
					</span>
					{call.function_signature && (
						<span className={css({ ml: '1', color: 'fg.muted', fontSize: 'xs' })}>
							({formatHash(call.function_signature, 4)})
						</span>
					)}
				</>
			)
		},
	}),
	columnHelper.accessor('value', {
		header: 'Value',
		enableSorting: false,
		cell: ({ getValue }) => (
			<span className={css({ fontFamily: 'mono', fontSize: 'sm' })}>
				{getValue() === '0' ? '-' : `${(BigInt(getValue()) / BigInt(10 ** 18)).toString()} RAI`}
			</span>
		),
	}),
	columnHelper.accessor('status', {
		header: 'Status',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() === 1 ? (
				<Badge variant="success" className={hstack({ gap: '1' })}>
					<CheckCircle className={css({ w: '3', h: '3' })} />
					Success
				</Badge>
			) : (
				<Badge variant="destructive" className={hstack({ gap: '1' })}>
					<XCircle className={css({ w: '3', h: '3' })} />
					Failed
				</Badge>
			),
	}),
]

export function ContractDetails({ address }: ContractDetailsProps) {
	const { data: contract, isLoading: contractLoading } = useQuery({
		queryKey: ['evm-contract', address],
		queryFn: () => api.getEvmContractDetails(address),
		staleTime: 60000,
	})

	const { data: functionStats, isLoading: statsLoading } = useQuery({
		queryKey: ['evm-contract-functions', address],
		queryFn: () => api.getEvmContractFunctionStats(address),
		staleTime: 30000,
	})

	const { data: recentCalls, isLoading: callsLoading } = useQuery({
		queryKey: ['evm-contract-calls', address],
		queryFn: () => api.getEvmContractCalls(address, 10, 0),
		staleTime: 15000,
	})

	if (contractLoading) {
		return (
			<div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
				<Skeleton className={css({ h: '32', w: 'full' })} />
				<Skeleton className={css({ h: '48', w: 'full' })} />
			</div>
		)
	}

	if (!contract) {
		return null
	}

	return (
		<div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
			{/* Contract Info Card */}
			<Card>
				<CardHeader className={hstack({ justify: 'space-between' })}>
					<CardTitle className={hstack({ gap: '2' })}>
						<FileCode className={css({ w: '5', h: '5' })} />
						Contract Information
					</CardTitle>
					{contract.is_verified && (
						<Badge variant="success" className={hstack({ gap: '1' })}>
							<CheckCircle className={css({ w: '3', h: '3' })} />
							Verified
						</Badge>
					)}
				</CardHeader>
				<CardContent>
					<div className={grid({ columns: { base: 1, md: 2 }, gap: '4' })}>
						{/* Creator */}
						<div className={css({ p: '3', bg: 'bg.subtle', borderRadius: 'lg', border: '1px solid', borderColor: 'border.default' })}>
							<div className={hstack({ gap: '2', mb: '1' })}>
								<User className={css({ w: '4', h: '4', color: 'fg.muted' })} />
								<span className={css({ fontSize: 'sm', color: 'fg.muted' })}>Creator</span>
							</div>
							{contract.creator ? (
								<Link
									to={`/addr/${contract.creator}`}
									className={css({ fontFamily: 'mono', fontSize: 'sm', color: 'chart.secondary', _hover: { color: 'accent.default' } })}
								>
									{formatHash(contract.creator, 10)}
								</Link>
							) : (
								<span className={css({ color: 'fg.muted', fontSize: 'sm' })}>Unknown</span>
							)}
						</div>

						{/* Creation Transaction */}
						<div className={css({ p: '3', bg: 'bg.subtle', borderRadius: 'lg', border: '1px solid', borderColor: 'border.default' })}>
							<div className={hstack({ gap: '2', mb: '1' })}>
								<Hash className={css({ w: '4', h: '4', color: 'fg.muted' })} />
								<span className={css({ fontSize: 'sm', color: 'fg.muted' })}>Creation Tx</span>
							</div>
							{contract.creation_tx ? (
								<Link
									to={`/tx/${contract.creation_tx}`}
									className={css({ fontFamily: 'mono', fontSize: 'sm', color: 'chart.secondary', _hover: { color: 'accent.default' } })}
								>
									{formatHash(contract.creation_tx, 10)}
								</Link>
							) : (
								<span className={css({ color: 'fg.muted', fontSize: 'sm' })}>Unknown</span>
							)}
						</div>

						{/* Creation Block */}
						<div className={css({ p: '3', bg: 'bg.subtle', borderRadius: 'lg', border: '1px solid', borderColor: 'border.default' })}>
							<div className={hstack({ gap: '2', mb: '1' })}>
								<Clock className={css({ w: '4', h: '4', color: 'fg.muted' })} />
								<span className={css({ fontSize: 'sm', color: 'fg.muted' })}>Creation Block</span>
							</div>
							{contract.creation_height ? (
								<Link
									to={`/blocks/${contract.creation_height}`}
									className={css({ fontFamily: 'mono', fontSize: 'sm', color: 'chart.secondary', _hover: { color: 'accent.default' } })}
								>
									{formatNumber(contract.creation_height)}
								</Link>
							) : (
								<span className={css({ color: 'fg.muted', fontSize: 'sm' })}>Unknown</span>
							)}
						</div>

						{/* Bytecode Hash */}
						<div className={css({ p: '3', bg: 'bg.subtle', borderRadius: 'lg', border: '1px solid', borderColor: 'border.default' })}>
							<div className={hstack({ gap: '2', mb: '1' })}>
								<FileCode className={css({ w: '4', h: '4', color: 'fg.muted' })} />
								<span className={css({ fontSize: 'sm', color: 'fg.muted' })}>Bytecode Hash</span>
							</div>
							{contract.bytecode_hash ? (
								<span className={css({ fontFamily: 'mono', fontSize: 'xs', wordBreak: 'break-all' })}>
									{formatHash(contract.bytecode_hash, 12)}
								</span>
							) : (
								<span className={css({ color: 'fg.muted', fontSize: 'sm' })}>Not available</span>
							)}
						</div>
					</div>

					{/* Contract Name if available */}
					{contract.name && (
						<div className={css({ mt: '4', p: '3', bg: 'bg.accentSubtle', borderRadius: 'lg', border: '1px solid', borderColor: 'border.accent' })}>
							<span className={css({ fontSize: 'sm', color: 'fg.muted' })}>Contract Name: </span>
							<span className={css({ fontWeight: 'semibold' })}>{contract.name}</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Function Call Statistics */}
			<Card>
				<CardHeader>
					<CardTitle className={hstack({ gap: '2' })}>
						<Activity className={css({ w: '5', h: '5' })} />
						Function Calls
					</CardTitle>
				</CardHeader>
				<CardContent>
					{statsLoading ? (
						<Skeleton className={css({ h: '24', w: 'full' })} />
					) : functionStats && functionStats.length > 0 ? (
						<div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
							{functionStats.slice(0, 10).map((stat, idx) => {
								const selector = stat.function_signature?.slice(0, 10) || 'unknown'
								const displayName = stat.function_name || extractFunctionName(COMMON_SIGNATURES[selector] || selector)
								return (
									<div
										key={idx}
										className={css({
											p: '2',
											px: '3',
											bg: 'bg.subtle',
											borderRadius: 'lg',
											border: '1px solid',
											borderColor: 'border.default',
											display: 'flex',
											alignItems: 'center',
											gap: '2',
										})}
									>
										<span className={css({ fontFamily: 'mono', fontSize: 'sm', fontWeight: 'medium' })}>
											{displayName}
										</span>
										<Badge variant="secondary" className={css({ fontSize: 'xs' })}>
											{formatNumber(stat.call_count)}
										</Badge>
									</div>
								)
							})}
						</div>
					) : (
						<p className={css({ color: 'fg.muted', fontSize: 'sm' })}>No function calls recorded</p>
					)}
				</CardContent>
			</Card>

			{/* Recent Contract Calls */}
			<Card>
				<CardHeader className={hstack({ justify: 'space-between' })}>
					<CardTitle>Recent Contract Calls</CardTitle>
					{recentCalls && recentCalls.total > 10 && (
						<Badge variant="outline">{formatNumber(recentCalls.total)} total</Badge>
					)}
				</CardHeader>
				<CardContent>
					<DataTable
						columns={contractCallColumns}
						data={recentCalls?.data ?? []}
						hidePagination
						isLoading={callsLoading}
						pageSize={10}
						getRowId={(call) => call.tx_id}
						emptyState={
							<p className={css({ color: 'fg.muted', fontSize: 'sm' })}>No contract calls found</p>
						}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
