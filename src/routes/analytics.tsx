/**
 * Analytics Dashboard - Network metrics, validator insights, and real-time statistics
 */

import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import {
	Activity,
	Award,
	ChevronRight,
	Clock,
	Database,
	Shield,
	ShieldAlert,
	TrendingUp,
	Users,
	Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BlockIntervalChart } from '@/components/analytics/BlockIntervalChart'
import { TransactionVolumeChart } from '@/components/analytics/TransactionVolumeChart'
import { api, NetworkOverview, ValidatorLeaderboardEntry, ValidatorEventSummary, HourlyRewards } from '@/lib/api'
import { formatDenomAmount } from '@/lib/denom'
import { DenomDisplay } from '@/components/common/DenomDisplay'
import { formatAddress } from '@/lib/utils'
import { getChainBaseDenom, getChainDisplayDenom } from '@/lib/chain-info'
import { css, cx } from '@/styled-system/css'
import { token } from '@/styled-system/tokens'

/**
 * Formats large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
	if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
	if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
	return num.toLocaleString()
}

/**
 * Formats time elapsed in human-readable format
 */
function formatTimeAgo(dateString: string): string {
	const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
	if (seconds < 60) return `${seconds}s ago`
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
	return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * Hero Stats Section - Large prominent metrics at the top
 */
function HeroStats({ overview }: { overview: NetworkOverview }) {
	const baseDenom = getChainBaseDenom()
	const displayDenom = getChainDisplayDenom()

	const stats = [
		{
			icon: Users,
			label: 'Active Validators',
			value: overview.active_validators.toString(),
			subtext: `${overview.jailed_validators} jailed`,
			accent: true,
		},
		{
			icon: Database,
			label: 'Transactions',
			value: formatNumber(overview.total_transactions),
			subtext: `${formatNumber(overview.unique_addresses)} addresses`,
		},
		{
			icon: Clock,
			label: 'Block Time',
			value: `${overview.avg_block_time.toFixed(2)}s`,
			subtext: 'average',
		},
		{
			icon: Shield,
			label: 'Bonded Tokens',
			value: formatDenomAmount(overview.total_bonded_tokens, baseDenom, { maxDecimals: 0 }),
			subtext: displayDenom,
		},
	]

	return (
		<div className={styles.heroGrid}>
			{stats.map((stat, idx) => {
				const Icon = stat.icon
				return (
					<div key={idx} className={cx(styles.heroCard, stat.accent && styles.heroCardAccent)}>
						<div className={styles.heroIconWrap}>
							<Icon className={styles.heroIcon} />
						</div>
						<div className={styles.heroContent}>
							<span className={styles.heroLabel}>{stat.label}</span>
							<span className={styles.heroValue}>{stat.value}</span>
							<span className={styles.heroSubtext}>{stat.subtext}</span>
						</div>
						{stat.accent && <div className={styles.heroGlow} />}
					</div>
				)
			})}
		</div>
	)
}

/**
 * Network Health Bar - Visual indicator of network status
 */
function NetworkHealthBar({ overview }: { overview: NetworkOverview }) {
	const healthScore = Math.min(100, (overview.active_validators / Math.max(1, overview.total_validators)) * 100)
	const isHealthy = healthScore >= 66
	const isWarning = healthScore >= 33 && healthScore < 66

	return (
		<div className={styles.healthContainer}>
			<div className={styles.healthHeader}>
				<div className={styles.healthTitleWrap}>
					<Activity className={styles.healthIcon} />
					<span className={styles.healthTitle}>Network Health</span>
				</div>
				<span className={cx(
					styles.healthBadge,
					isHealthy && styles.healthBadgeGood,
					isWarning && styles.healthBadgeWarning,
					!isHealthy && !isWarning && styles.healthBadgeCritical
				)}>
					{isHealthy ? 'Healthy' : isWarning ? 'Degraded' : 'Critical'}
				</span>
			</div>
			<div className={styles.healthBarOuter}>
				<div
					className={cx(
						styles.healthBarInner,
						isHealthy && styles.healthBarGood,
						isWarning && styles.healthBarWarning,
						!isHealthy && !isWarning && styles.healthBarCritical
					)}
					style={{ width: `${healthScore}%` }}
				/>
			</div>
			<div className={styles.healthStats}>
				<span>{overview.active_validators} / {overview.total_validators} validators active</span>
				<span>{healthScore.toFixed(0)}%</span>
			</div>
		</div>
	)
}

/**
 * Validator Leaderboard - Top validators with key metrics
 */
function ValidatorLeaderboard({ validators }: { validators: ValidatorLeaderboardEntry[] }) {
	const baseDenom = getChainBaseDenom()
	const topValidators = validators.slice(0, 10)

	return (
		<Card withGlow>
			<CardHeader className={styles.sectionHeader}>
				<div className={styles.sectionTitleWrap}>
					<Award className={styles.sectionIcon} />
					<CardTitle>Validator Leaderboard</CardTitle>
				</div>
				<Link to="/validators" className={styles.viewAllLink}>
					View all <ChevronRight size={14} />
				</Link>
			</CardHeader>
			<CardContent className={styles.leaderboardContent}>
				<div className={styles.leaderboardHeader}>
					<span className={styles.leaderboardRank}>#</span>
					<span className={styles.leaderboardValidator}>Validator</span>
					<span className={styles.leaderboardStake}>Voting Power</span>
					<span className={styles.leaderboardRewards}>Lifetime Rewards</span>
					<span className={styles.leaderboardCommission}>Commission</span>
				</div>
				{topValidators.map((validator, idx) => (
					<Link
						key={validator.operator_address}
						to={`/validators/${validator.operator_address}`}
						className={cx(styles.leaderboardRow, validator.jailed && styles.leaderboardRowJailed)}
					>
						<span className={styles.leaderboardRank}>
							{idx + 1}
						</span>
						<span className={styles.leaderboardValidator}>
							<span className={styles.validatorMoniker}>
								{validator.moniker || formatAddress(validator.operator_address, 8)}
							</span>
							{validator.jailed && (
								<span className={styles.jailedBadge}>Jailed</span>
							)}
						</span>
						<span className={styles.leaderboardStake}>
							{formatDenomAmount(validator.tokens, baseDenom, { maxDecimals: 0 })}
						</span>
						<span className={styles.leaderboardRewards}>
							{formatDenomAmount(validator.lifetime_rewards, baseDenom, { maxDecimals: 2 })}
						</span>
						<span className={styles.leaderboardCommission}>
							{(parseFloat(validator.commission_rate) * 100).toFixed(1)}%
						</span>
					</Link>
				))}
			</CardContent>
		</Card>
	)
}

/**
 * Validator Events Feed - Recent slashing/jailing events
 */
function ValidatorEventsFeed({ events }: { events: ValidatorEventSummary[] }) {
	const getEventIcon = (eventType: string) => {
		if (eventType.includes('slash')) return <Zap className={styles.eventIconSlash} />
		if (eventType.includes('jail')) return <ShieldAlert className={styles.eventIconJail} />
		return <Activity className={styles.eventIconDefault} />
	}

	const getEventLabel = (eventType: string) => {
		if (eventType.includes('slash')) return 'Slashed'
		if (eventType.includes('jail')) return 'Jailed'
		if (eventType.includes('unjail')) return 'Unjailed'
		return eventType.replace(/_/g, ' ')
	}

	return (
		<Card>
			<CardHeader className={styles.sectionHeader}>
				<div className={styles.sectionTitleWrap}>
					<ShieldAlert className={styles.sectionIcon} />
					<CardTitle>Recent Events</CardTitle>
				</div>
			</CardHeader>
			<CardContent className={styles.eventsFeedContent}>
				{events.length === 0 ? (
					<div className={styles.emptyState}>
						<Shield className={styles.emptyIcon} />
						<span>No recent validator events</span>
					</div>
				) : (
					<div className={styles.eventsList}>
						{events.slice(0, 8).map((event, idx) => (
							<div key={`${event.height}-${idx}`} className={styles.eventItem}>
								<div className={styles.eventIconWrap}>
									{getEventIcon(event.event_type)}
								</div>
								<div className={styles.eventDetails}>
									<span className={styles.eventTitle}>
										{event.validator_moniker || formatAddress(event.operator_address || '', 8)}
									</span>
									<span className={styles.eventType}>{getEventLabel(event.event_type)}</span>
								</div>
								<div className={styles.eventMeta}>
									<span className={styles.eventHeight}>#{event.height.toLocaleString()}</span>
									{event.block_time && (
										<span className={styles.eventTime}>{formatTimeAgo(event.block_time)}</span>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

/**
 * Hourly Rewards Chart - Shows validator rewards distribution over time
 */
function HourlyRewardsChart({ data }: { data: HourlyRewards[] }) {
	const baseDenom = getChainBaseDenom()

	if (!data || data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<div className={styles.sectionTitleWrap}>
						<TrendingUp className={styles.sectionIcon} />
						<CardTitle>Hourly Rewards</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<div className={styles.chartLoading}>Loading rewards data...</div>
				</CardContent>
			</Card>
		)
	}

	const totalRewards = data.reduce((sum, d) => sum + parseFloat(d.rewards || '0'), 0)
	const totalCommission = data.reduce((sum, d) => sum + parseFloat(d.commission || '0'), 0)

	const option = {
		tooltip: {
			trigger: 'axis',
			backgroundColor: token('colors.bg.muted'),
			borderColor: token('colors.border.accent'),
			textStyle: { color: token('colors.fg.default') },
			axisPointer: {
				type: 'cross',
				lineStyle: { color: token('colors.republicGreen.7'), width: 1 }
			},
			formatter: (params: any) => {
				const date = new Date(params[0].axisValue)
				const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
				const rewards = parseFloat(params[0]?.value || 0)
				const commission = parseFloat(params[1]?.value || 0)
				return `<div style="font-size: 13px;">
					<strong>${dateStr} ${timeStr}</strong><br/>
					Rewards: <span style="color: ${token('colors.republicGreen.7')};">${formatDenomAmount(rewards.toString(), baseDenom, { maxDecimals: 4 })}</span><br/>
					Commission: <span style="color: ${token('colors.republicGreen.5')};">${formatDenomAmount(commission.toString(), baseDenom, { maxDecimals: 4 })}</span>
				</div>`
			}
		},
		legend: {
			data: ['Rewards', 'Commission'],
			textStyle: { color: '#707B92', fontSize: 11 },
			right: 10,
			top: 0
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '8%',
			top: '15%',
			containLabel: true
		},
		xAxis: {
			type: 'category',
			boundaryGap: false,
			data: data.map(d => d.hour),
			axisLabel: {
				color: '#707B92',
				fontSize: 11,
				formatter: (value: string) => {
					const date = new Date(value)
					return date.toLocaleTimeString([], { hour: '2-digit' })
				},
				interval: Math.floor(data.length / 6)
			},
			axisLine: { lineStyle: { color: token('colors.border.default') } },
			splitLine: { show: false }
		},
		yAxis: {
			type: 'value',
			axisLabel: {
				color: '#707B92',
				fontSize: 11,
				formatter: (value: number) => formatNumber(value)
			},
			axisLine: { show: false },
			splitLine: { lineStyle: { color: token('colors.border.default'), type: 'dashed' } }
		},
		series: [
			{
				name: 'Rewards',
				type: 'line',
				smooth: true,
				symbol: 'none',
				lineStyle: { width: 2, color: token('colors.republicGreen.7') },
				areaStyle: {
					color: {
						type: 'linear',
						x: 0, y: 0, x2: 0, y2: 1,
						colorStops: [
							{ offset: 0, color: 'rgba(48, 255, 110, 0.3)' },
							{ offset: 1, color: 'rgba(48, 255, 110, 0.02)' }
						]
					}
				},
				data: data.map(d => parseFloat(d.rewards || '0'))
			},
			{
				name: 'Commission',
				type: 'line',
				smooth: true,
				symbol: 'none',
				lineStyle: { width: 2, color: token('colors.republicGreen.5') },
				data: data.map(d => parseFloat(d.commission || '0'))
			}
		]
	}

	return (
		<Card>
			<CardHeader>
				<div className={styles.sectionTitleWrap}>
					<TrendingUp className={styles.sectionIcon} />
					<CardTitle>Hourly Rewards</CardTitle>
				</div>
				<p className={styles.chartSubtitle}>
					24h total: {formatDenomAmount(totalRewards.toString(), baseDenom, { maxDecimals: 2 })} rewards | {formatDenomAmount(totalCommission.toString(), baseDenom, { maxDecimals: 2 })} commission
				</p>
			</CardHeader>
			<CardContent>
				<ReactECharts option={option} style={{ height: '280px' }} opts={{ renderer: 'canvas' }} notMerge={true} lazyUpdate={true} />
			</CardContent>
		</Card>
	)
}

/**
 * 24h Rewards Summary Cards
 */
function RewardsSummary({ overview }: { overview: NetworkOverview }) {
	const baseDenom = getChainBaseDenom()
	const displayDenom = getChainDisplayDenom()

	return (
		<div className={styles.rewardsSummaryGrid}>
			<div className={styles.rewardCard}>
				<span className={styles.rewardLabel}>24h Rewards Distributed</span>
				<span className={styles.rewardValue}>
					{formatDenomAmount(overview.total_rewards_24h, baseDenom, { maxDecimals: 2 })}
				</span>
				<DenomDisplay denom={baseDenom} className={styles.rewardDenom} />
			</div>
			<div className={styles.rewardCard}>
				<span className={styles.rewardLabel}>24h Commission Earned</span>
				<span className={styles.rewardValue}>
					{formatDenomAmount(overview.total_commission_24h, baseDenom, { maxDecimals: 2 })}
				</span>
				<DenomDisplay denom={baseDenom} className={styles.rewardDenom} />
			</div>
		</div>
	)
}

/**
 * Main Analytics Page Component
 */
export default function AnalyticsPage() {
	const { data: overview, isLoading: overviewLoading } = useQuery({
		queryKey: ['network-overview'],
		queryFn: () => api.getNetworkOverview(),
		refetchInterval: 30000,
	})

	const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
		queryKey: ['validator-leaderboard'],
		queryFn: () => api.getValidatorLeaderboard(),
		refetchInterval: 60000,
	})

	const { data: events } = useQuery({
		queryKey: ['validator-events-summary'],
		queryFn: () => api.getValidatorEventsSummary(20),
		refetchInterval: 30000,
	})

	const { data: hourlyRewards } = useQuery({
		queryKey: ['hourly-rewards'],
		queryFn: () => api.getHourlyRewards(24),
		refetchInterval: 60000,
	})

	if (overviewLoading || leaderboardLoading) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<h1 className={styles.title}>Network Analytics</h1>
					<p className={styles.subtitle}>Real-time metrics and validator insights</p>
				</div>
				<div className={styles.loadingGrid}>
					{[...Array(4)].map((_, i) => (
						<div key={i} className={styles.loadingSkeleton} />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className={styles.container}>
			{/* Page Header */}
			<div className={styles.header}>
				<h1 className={styles.title}>Network Analytics</h1>
				<p className={styles.subtitle}>Real-time metrics and validator insights</p>
			</div>

			{/* Hero Stats */}
			{overview && <HeroStats overview={overview} />}

			{/* Network Health + 24h Rewards Summary */}
			{overview && (
				<div className={styles.healthRewardsGrid}>
					<NetworkHealthBar overview={overview} />
					<RewardsSummary overview={overview} />
				</div>
			)}

			{/* Leaderboard + Events Side by Side */}
			<div className={styles.leaderboardEventsGrid}>
				{leaderboard && <ValidatorLeaderboard validators={leaderboard} />}
				{events && <ValidatorEventsFeed events={events} />}
			</div>

			{/* Charts Section */}
			<div className={styles.chartsSection}>
				<h2 className={styles.sectionTitle}>Performance Charts</h2>
				<div className={styles.chartsGrid}>
					{hourlyRewards && <HourlyRewardsChart data={hourlyRewards} />}
					<TransactionVolumeChart />
					<BlockIntervalChart />
				</div>
			</div>
		</div>
	)
}

const styles = {
	// Layout
	container: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '8',
		w: 'full',
		pb: '12',
	}),
	header: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1',
	}),
	title: css({
		fontSize: '3xl',
		fontWeight: 'bold',
		color: 'white',
		letterSpacing: '-0.02em',
	}),
	subtitle: css({
		fontSize: 'md',
		color: 'fg.muted',
	}),

	// Hero Stats Grid
	heroGrid: css({
		display: 'grid',
		gap: '4',
		gridTemplateColumns: {
			base: 'repeat(2, 1fr)',
			md: 'repeat(4, 1fr)',
		},
	}),
	heroCard: css({
		position: 'relative',
		display: 'flex',
		alignItems: 'center',
		gap: '4',
		p: '5',
		bg: 'bg.subtle',
		border: '1px solid',
		borderColor: 'border.default',
		borderRadius: 'xl',
		overflow: 'hidden',
		transition: 'all 0.2s ease',
		_hover: {
			borderColor: 'border.accent',
			transform: 'translateY(-1px)',
		},
	}),
	heroCardAccent: css({
		borderColor: 'republicGreen.7/30',
		bg: 'linear-gradient(135deg, rgba(48, 255, 110, 0.05) 0%, transparent 50%)',
	}),
	heroGlow: css({
		position: 'absolute',
		top: '-50%',
		right: '-50%',
		w: '100%',
		h: '100%',
		bg: 'radial-gradient(circle, rgba(48, 255, 110, 0.15) 0%, transparent 70%)',
		pointerEvents: 'none',
	}),
	heroIconWrap: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		w: '12',
		h: '12',
		borderRadius: 'lg',
		bg: 'bg.muted',
		color: 'republicGreen.7',
		flexShrink: 0,
	}),
	heroIcon: css({
		w: '6',
		h: '6',
	}),
	heroContent: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5',
		minW: 0,
	}),
	heroLabel: css({
		fontSize: 'xs',
		fontWeight: 'medium',
		color: 'fg.muted',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	}),
	heroValue: css({
		fontSize: '2xl',
		fontWeight: 'bold',
		color: 'white',
		lineHeight: '1.1',
	}),
	heroSubtext: css({
		fontSize: 'sm',
		color: 'fg.subtle',
	}),

	// Network Health
	healthRewardsGrid: css({
		display: 'grid',
		gap: '4',
		gridTemplateColumns: {
			base: '1fr',
			lg: '2fr 1fr',
		},
	}),
	healthContainer: css({
		p: '5',
		bg: 'bg.subtle',
		border: '1px solid',
		borderColor: 'border.default',
		borderRadius: 'xl',
	}),
	healthHeader: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		mb: '3',
	}),
	healthTitleWrap: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
	}),
	healthIcon: css({
		w: '5',
		h: '5',
		color: 'republicGreen.7',
	}),
	healthTitle: css({
		fontSize: 'sm',
		fontWeight: 'semibold',
		color: 'white',
	}),
	healthBadge: css({
		px: '2.5',
		py: '0.5',
		borderRadius: 'full',
		fontSize: 'xs',
		fontWeight: 'semibold',
	}),
	healthBadgeGood: css({
		bg: 'republicGreen.7/20',
		color: 'republicGreen.7',
	}),
	healthBadgeWarning: css({
		bg: 'amber.500/20',
		color: 'amber.400',
	}),
	healthBadgeCritical: css({
		bg: 'red.500/20',
		color: 'red.400',
	}),
	healthBarOuter: css({
		h: '2',
		bg: 'bg.muted',
		borderRadius: 'full',
		overflow: 'hidden',
	}),
	healthBarInner: css({
		h: 'full',
		borderRadius: 'full',
		transition: 'width 0.5s ease',
	}),
	healthBarGood: css({
		bg: 'republicGreen.7',
	}),
	healthBarWarning: css({
		bg: 'amber.500',
	}),
	healthBarCritical: css({
		bg: 'red.500',
	}),
	healthStats: css({
		display: 'flex',
		justifyContent: 'space-between',
		mt: '2',
		fontSize: 'xs',
		color: 'fg.muted',
	}),

	// Rewards Summary
	rewardsSummaryGrid: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '3',
	}),
	rewardCard: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1',
		p: '4',
		bg: 'bg.subtle',
		border: '1px solid',
		borderColor: 'border.default',
		borderRadius: 'lg',
	}),
	rewardLabel: css({
		fontSize: 'xs',
		fontWeight: 'medium',
		color: 'fg.muted',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	}),
	rewardValue: css({
		fontSize: 'xl',
		fontWeight: 'bold',
		color: 'republicGreen.7',
	}),
	rewardDenom: css({
		fontSize: 'sm',
		color: 'fg.subtle',
	}),

	// Leaderboard + Events Grid
	leaderboardEventsGrid: css({
		display: 'grid',
		gap: '6',
		gridTemplateColumns: {
			base: '1fr',
			lg: '2fr 1fr',
		},
	}),

	// Section Headers
	sectionHeader: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		pb: '4',
	}),
	sectionTitleWrap: css({
		display: 'flex',
		alignItems: 'center',
		gap: '3',
	}),
	sectionIcon: css({
		w: '5',
		h: '5',
		color: 'republicGreen.7',
	}),
	sectionTitle: css({
		fontSize: 'xl',
		fontWeight: 'semibold',
		color: 'white',
		mb: '4',
	}),
	viewAllLink: css({
		display: 'flex',
		alignItems: 'center',
		gap: '1',
		fontSize: 'sm',
		color: 'republicGreen.7',
		fontWeight: 'medium',
		transition: 'opacity 0.2s',
		_hover: {
			opacity: 0.8,
		},
	}),

	// Leaderboard
	leaderboardContent: css({
		p: '0',
	}),
	leaderboardHeader: css({
		display: 'grid',
		gridTemplateColumns: '40px 1fr 120px 140px 90px',
		gap: '3',
		px: '4',
		py: '2',
		fontSize: 'xs',
		fontWeight: 'semibold',
		color: 'fg.muted',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		borderBottom: '1px solid',
		borderColor: 'border.default',
	}),
	leaderboardRank: css({
		textAlign: 'center',
	}),
	leaderboardValidator: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
	}),
	leaderboardStake: css({
		textAlign: 'right',
	}),
	leaderboardRewards: css({
		textAlign: 'right',
	}),
	leaderboardCommission: css({
		textAlign: 'right',
	}),
	leaderboardRow: css({
		display: 'grid',
		gridTemplateColumns: '40px 1fr 120px 140px 90px',
		gap: '3',
		px: '4',
		py: '3',
		fontSize: 'sm',
		color: 'fg.default',
		borderBottom: '1px solid',
		borderColor: 'border.default',
		transition: 'background 0.2s',
		_hover: {
			bg: 'bg.subtle',
		},
		_last: {
			borderBottom: 'none',
		},
	}),
	leaderboardRowJailed: css({
		opacity: 0.5,
	}),
	validatorMoniker: css({
		fontWeight: 'medium',
		color: 'white',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	}),
	jailedBadge: css({
		px: '1.5',
		py: '0.5',
		fontSize: '10px',
		fontWeight: 'semibold',
		color: 'red.400',
		bg: 'red.500/20',
		borderRadius: 'sm',
	}),

	// Events Feed
	eventsFeedContent: css({
		p: '0',
	}),
	emptyState: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '3',
		py: '12',
		color: 'fg.muted',
		fontSize: 'sm',
	}),
	emptyIcon: css({
		w: '8',
		h: '8',
		opacity: 0.5,
	}),
	eventsList: css({
		display: 'flex',
		flexDirection: 'column',
	}),
	eventItem: css({
		display: 'flex',
		alignItems: 'center',
		gap: '3',
		px: '4',
		py: '3',
		borderBottom: '1px solid',
		borderColor: 'border.default',
		_last: {
			borderBottom: 'none',
		},
	}),
	eventIconWrap: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		w: '8',
		h: '8',
		borderRadius: 'md',
		bg: 'bg.muted',
		flexShrink: 0,
	}),
	eventIconSlash: css({
		w: '4',
		h: '4',
		color: 'red.400',
	}),
	eventIconJail: css({
		w: '4',
		h: '4',
		color: 'amber.400',
	}),
	eventIconDefault: css({
		w: '4',
		h: '4',
		color: 'fg.muted',
	}),
	eventDetails: css({
		flex: 1,
		minW: 0,
	}),
	eventTitle: css({
		display: 'block',
		fontSize: 'sm',
		fontWeight: 'medium',
		color: 'white',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	}),
	eventType: css({
		display: 'block',
		fontSize: 'xs',
		color: 'fg.muted',
		textTransform: 'capitalize',
	}),
	eventMeta: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-end',
		gap: '0.5',
		flexShrink: 0,
	}),
	eventHeight: css({
		fontSize: 'xs',
		fontWeight: 'medium',
		color: 'fg.subtle',
	}),
	eventTime: css({
		fontSize: 'xs',
		color: 'fg.muted',
	}),

	// Charts
	chartsSection: css({
		mt: '4',
	}),
	chartsGrid: css({
		display: 'grid',
		gap: '6',
		gridTemplateColumns: {
			base: '1fr',
			lg: 'repeat(2, 1fr)',
		},
	}),
	chartLoading: css({
		h: '280px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: 'fg.muted',
	}),
	chartSubtitle: css({
		fontSize: 'sm',
		color: 'fg.muted',
		mt: '1',
	}),

	// Loading States
	loadingGrid: css({
		display: 'grid',
		gap: '4',
		gridTemplateColumns: {
			base: 'repeat(2, 1fr)',
			md: 'repeat(4, 1fr)',
		},
	}),
	loadingSkeleton: css({
		h: '100px',
		bg: 'bg.subtle',
		borderRadius: 'xl',
		animation: 'pulse',
	}),
}
