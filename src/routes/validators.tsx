import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle, Shield, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, type JailingEvent, type Validator } from "@/lib/api"
import { formatNumber, formatTimeAgo } from "@/lib/utils"
import { css } from "@/styled-system/css"

function formatTokens(tokens: string | null): string {
	if (!tokens) return "-"
	const num = BigInt(tokens)
	const millions = Number(num / BigInt(1_000_000))
	if (millions >= 1000) {
		return `${(millions / 1000).toFixed(2)}B`
	}
	if (millions >= 1) {
		return `${millions.toFixed(2)}M`
	}
	return formatNumber(Number(tokens))
}

function ValidatorStatusBadge({ validator }: { validator: Validator }) {
	if (validator.jailed) {
		return (
			<Badge
				variant="destructive"
				className={css({ display: "flex", alignItems: "center", gap: "1" })}
			>
				<XCircle className={css({ h: "3", w: "3" })} />
				Jailed
			</Badge>
		)
	}
	if (validator.status === "BOND_STATUS_BONDED") {
		return (
			<Badge
				variant="success"
				className={css({ display: "flex", alignItems: "center", gap: "1" })}
			>
				<CheckCircle className={css({ h: "3", w: "3" })} />
				Active
			</Badge>
		)
	}
	if (validator.status === "BOND_STATUS_UNBONDING") {
		return (
			<Badge
				variant="warning"
				className={css({ display: "flex", alignItems: "center", gap: "1" })}
			>
				<AlertTriangle className={css({ h: "3", w: "3" })} />
				Unbonding
			</Badge>
		)
	}
	return (
		<Badge variant="secondary">
			{validator.status?.replace("BOND_STATUS_", "") || "Unknown"}
		</Badge>
	)
}

function ValidatorList() {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const {
		data: validators,
		isLoading,
		error
	} = useQuery({
		queryKey: ["validators"],
		queryFn: () => api.getValidators(200, 0),
		enabled: mounted,
		staleTime: 60000
	})

	if (!mounted || isLoading) {
		return (
			<div
				className={css({ display: "flex", flexDirection: "column", gap: "3" })}
			>
				{Array.from({ length: 10 }).map((_, i) => (
					<Skeleton key={i} className={css({ h: "16", w: "full" })} />
				))}
			</div>
		)
	}

	if (error) {
		return (
			<div className={css({ color: "red.500", p: "4" })}>
				Error loading validators: {String(error)}
			</div>
		)
	}

	const activeValidators =
		validators?.filter((v) => !v.jailed && v.status === "BOND_STATUS_BONDED") ||
		[]
	const jailedValidators = validators?.filter((v) => v.jailed) || []
	const otherValidators =
		validators?.filter((v) => !v.jailed && v.status !== "BOND_STATUS_BONDED") ||
		[]

	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "4" })}
		>
			<div
				className={css({
					display: "grid",
					gap: "4",
					gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" }
				})}
			>
				<Card>
					<CardContent className={css({ pt: "4" })}>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "3"
							})}
						>
							<CheckCircle
								className={css({ h: "8", w: "8", color: "green.500" })}
							/>
							<div>
								<div className={css({ fontSize: "2xl", fontWeight: "bold" })}>
									{activeValidators.length}
								</div>
								<div className={css({ fontSize: "sm", color: "fg.muted" })}>
									Active Validators
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className={css({ pt: "4" })}>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "3"
							})}
						>
							<XCircle className={css({ h: "8", w: "8", color: "red.500" })} />
							<div>
								<div className={css({ fontSize: "2xl", fontWeight: "bold" })}>
									{jailedValidators.length}
								</div>
								<div className={css({ fontSize: "sm", color: "fg.muted" })}>
									Jailed Validators
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className={css({ pt: "4" })}>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "3"
							})}
						>
							<Shield className={css({ h: "8", w: "8", color: "fg.muted" })} />
							<div>
								<div className={css({ fontSize: "2xl", fontWeight: "bold" })}>
									{validators?.length || 0}
								</div>
								<div className={css({ fontSize: "sm", color: "fg.muted" })}>
									Total Validators
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Validator Set</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "2"
						})}
					>
						<div
							className={css({
								display: "grid",
								gridTemplateColumns: "2fr 1fr 1fr 1fr",
								gap: "4",
								p: "3",
								bg: "bg.muted",
								borderRadius: "md",
								fontSize: "sm",
								fontWeight: "medium",
								color: "fg.muted"
							})}
						>
							<div>Validator</div>
							<div>Voting Power</div>
							<div>Commission</div>
							<div>Status</div>
						</div>
						{validators?.map((validator, index) => (
							<Link
								key={validator.operator_address}
								to={`/validators/${validator.operator_address}`}
								className={css({
									display: "grid",
									gridTemplateColumns: "2fr 1fr 1fr 1fr",
									gap: "4",
									p: "3",
									borderRadius: "md",
									_hover: { bg: "bg.muted" },
									transition: "background 0.2s"
								})}
							>
								<div
									className={css({
										display: "flex",
										alignItems: "center",
										gap: "3"
									})}
								>
									<div
										className={css({
											w: "8",
											h: "8",
											borderRadius: "full",
											bg: "accent.default",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "white",
											fontSize: "sm",
											fontWeight: "bold"
										})}
									>
										{index + 1}
									</div>
									<div>
										<div className={css({ fontWeight: "medium" })}>
											{validator.moniker || "Unknown"}
										</div>
										<div
											className={css({
												fontSize: "xs",
												color: "fg.muted",
												fontFamily: "mono"
											})}
										>
											{validator.operator_address.slice(0, 12)}...
											{validator.operator_address.slice(-6)}
										</div>
									</div>
								</div>
								<div className={css({ display: "flex", alignItems: "center" })}>
									{formatTokens(validator.tokens)}
								</div>
								<div className={css({ display: "flex", alignItems: "center" })}>
									{validator.commission_rate
										? `${(parseFloat(validator.commission_rate) * 100).toFixed(1)}%`
										: "-"}
								</div>
								<div className={css({ display: "flex", alignItems: "center" })}>
									<ValidatorStatusBadge validator={validator} />
								</div>
							</Link>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function ValidatorEvents() {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const {
		data: events,
		isLoading,
		error
	} = useQuery({
		queryKey: ["validatorEvents"],
		queryFn: () =>
			api.getRecentValidatorEvents(["slash", "liveness", "jail"], 100, 0),
		enabled: mounted,
		staleTime: 30000,
		retry: 1
	})

	if (!mounted || isLoading) {
		return (
			<div
				className={css({ display: "flex", flexDirection: "column", gap: "3" })}
			>
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className={css({ h: "16", w: "full" })} />
				))}
			</div>
		)
	}

	if (error) {
		return (
			<Card>
				<CardContent className={css({ p: "6" })}>
					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "3",
							py: "8"
						})}
					>
						<AlertTriangle
							className={css({ h: "12", w: "12", color: "fg.muted" })}
						/>
						<div className={css({ textAlign: "center" })}>
							<div className={css({ fontWeight: "medium", mb: "1" })}>
								Validator Events Not Available
							</div>
							<div className={css({ fontSize: "sm", color: "fg.muted" })}>
								Block results extraction may not be enabled. Run yaci with
								--enable-block-results flag.
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (!events || events.length === 0) {
		return (
			<Card>
				<CardContent className={css({ p: "6" })}>
					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "3",
							py: "8"
						})}
					>
						<CheckCircle
							className={css({ h: "12", w: "12", color: "green.500" })}
						/>
						<div className={css({ textAlign: "center" })}>
							<div className={css({ fontWeight: "medium", mb: "1" })}>
								No Recent Events
							</div>
							<div className={css({ fontSize: "sm", color: "fg.muted" })}>
								No slashing or jailing events have occurred recently.
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Validator Events</CardTitle>
			</CardHeader>
			<CardContent>
				<div
					className={css({
						display: "flex",
						flexDirection: "column",
						gap: "3"
					})}
				>
					{events.map((event, index) => (
						<div
							key={`${event.height}-${index}`}
							className={css({
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								p: "4",
								borderRadius: "md",
								bg: "bg.muted",
								borderLeft: "4px solid",
								borderLeftColor:
									event.event_type === "slash" ? "red.500" : "orange.500"
							})}
						>
							<div
								className={css({
									display: "flex",
									flexDirection: "column",
									gap: "1"
								})}
							>
								<div
									className={css({
										display: "flex",
										alignItems: "center",
										gap: "2"
									})}
								>
									<Badge
										variant={
											event.event_type === "slash" ? "destructive" : "warning"
										}
									>
										{event.event_type.toUpperCase()}
									</Badge>
									<span className={css({ fontWeight: "medium" })}>
										{event.moniker ||
											event.validator_address.slice(0, 12) + "..."}
									</span>
								</div>
								<div className={css({ fontSize: "sm", color: "fg.muted" })}>
									{event.reason || "No reason provided"}
									{event.power && ` (Power: ${event.power})`}
								</div>
							</div>
							<div className={css({ textAlign: "right" })}>
								<Link
									to={`/blocks/${event.height}`}
									className={css({
										fontSize: "sm",
										color: "accent.default",
										_hover: { textDecoration: "underline" }
									})}
								>
									Block #{event.height}
								</Link>
								<div className={css({ fontSize: "xs", color: "fg.muted" })}>
									{event.created_at ? formatTimeAgo(event.created_at) : "-"}
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

export default function ValidatorsPage() {
	const [searchParams, setSearchParams] = useSearchParams()
	const activeTab = searchParams.get("tab") || "validators"

	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "5" })}
		>
			<div>
				<h1 className={css({ fontSize: "2xl", fontWeight: "bold", mb: "1" })}>
					Validators
				</h1>
				<p className={css({ color: "fg.muted" })}>
					View active validators and recent jailing/slashing events
				</p>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) => setSearchParams({ tab: value })}
			>
				<TabsList>
					<TabsTrigger value="validators">Validator Set</TabsTrigger>
					<TabsTrigger value="events">Jailing Events</TabsTrigger>
				</TabsList>

				<TabsContent value="validators" className={css({ mt: "4" })}>
					<ValidatorList />
				</TabsContent>

				<TabsContent value="events" className={css({ mt: "4" })}>
					<ValidatorEvents />
				</TabsContent>
			</Tabs>
		</div>
	)
}
