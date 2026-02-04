import { useQuery } from "@tanstack/react-query"
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle,
	ExternalLink,
	Globe,
	XCircle
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type Validator, type ValidatorJailingEvent } from "@/lib/api"
import { formatTimeAgo } from "@/lib/utils"
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
	return tokens
}

function ValidatorStatusBadge({ validator }: { validator: Validator }) {
	if (validator.jailed) {
		return (
			<Badge
				variant="destructive"
				className={css({ display: "flex", alignItems: "center", gap: "1" })}
			>
				<XCircle className={css({ h: "4", w: "4" })} />
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
				<CheckCircle className={css({ h: "4", w: "4" })} />
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
				<AlertTriangle className={css({ h: "4", w: "4" })} />
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

function ValidatorJailingHistory({
	operatorAddress
}: {
	operatorAddress: string
}) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const {
		data: events,
		isLoading,
		error
	} = useQuery({
		queryKey: ["validatorJailingEvents", operatorAddress],
		queryFn: () => api.getValidatorJailingEvents(operatorAddress, 50, 0),
		enabled: mounted,
		staleTime: 30000,
		retry: 1
	})

	if (!mounted || isLoading) {
		return (
			<div
				className={css({ display: "flex", flexDirection: "column", gap: "3" })}
			>
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className={css({ h: "12", w: "full" })} />
				))}
			</div>
		)
	}

	if (error) {
		return (
			<div
				className={css({
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "3",
					py: "6"
				})}
			>
				<AlertTriangle className={css({ h: "8", w: "8", color: "fg.muted" })} />
				<div className={css({ textAlign: "center" })}>
					<div className={css({ fontSize: "sm", color: "fg.muted" })}>
						Jailing history not available. Block results extraction may not be
						enabled.
					</div>
				</div>
			</div>
		)
	}

	if (!events || events.length === 0) {
		return (
			<div
				className={css({
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "3",
					py: "6"
				})}
			>
				<CheckCircle className={css({ h: "8", w: "8", color: "green.500" })} />
				<div className={css({ textAlign: "center" })}>
					<div className={css({ fontWeight: "medium", mb: "1" })}>
						Clean Record
					</div>
					<div className={css({ fontSize: "sm", color: "fg.muted" })}>
						No jailing events recorded for this validator.
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "3" })}
		>
			{events.map((event, index) => (
				<div
					key={`${event.height}-${index}`}
					className={css({
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						p: "3",
						borderRadius: "md",
						bg: "bg.muted",
						borderLeft: "3px solid",
						borderLeftColor:
							event.event_type === "slash" ? "red.500" : "orange.500"
					})}
				>
					<div>
						<Badge
							variant={event.event_type === "slash" ? "destructive" : "warning"}
						>
							{event.event_type.toUpperCase()}
						</Badge>
						<div
							className={css({ fontSize: "sm", color: "fg.muted", mt: "1" })}
						>
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
							{event.detected_at ? formatTimeAgo(event.detected_at) : "-"}
						</div>
					</div>
				</div>
			))}
		</div>
	)
}

export default function ValidatorDetailPage() {
	const { address } = useParams<{ address: string }>()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const {
		data: validator,
		isLoading,
		error
	} = useQuery({
		queryKey: ["validator", address],
		queryFn: () => api.getValidator(address || ""),
		enabled: mounted && !!address,
		staleTime: 30000
	})

	if (!mounted || isLoading) {
		return (
			<div
				className={css({ display: "flex", flexDirection: "column", gap: "5" })}
			>
				<Skeleton className={css({ h: "8", w: "48" })} />
				<Skeleton className={css({ h: "64", w: "full" })} />
			</div>
		)
	}

	if (error || !validator) {
		return (
			<div
				className={css({ display: "flex", flexDirection: "column", gap: "4" })}
			>
				<Link
					to="/validators"
					className={css({
						display: "flex",
						alignItems: "center",
						gap: "2",
						color: "fg.muted",
						_hover: { color: "fg.default" }
					})}
				>
					<ArrowLeft className={css({ h: "4", w: "4" })} />
					Back to Validators
				</Link>
				<Card>
					<CardContent className={css({ p: "6" })}>
						<div className={css({ color: "red.500" })}>
							Validator not found: {address}
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "5" })}
		>
			<Link
				to="/validators"
				className={css({
					display: "flex",
					alignItems: "center",
					gap: "2",
					color: "fg.muted",
					_hover: { color: "fg.default" }
				})}
			>
				<ArrowLeft className={css({ h: "4", w: "4" })} />
				Back to Validators
			</Link>

			<div className={css({ display: "flex", alignItems: "center", gap: "4" })}>
				<div
					className={css({
						w: "16",
						h: "16",
						borderRadius: "full",
						bg: "accent.default",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "white",
						fontSize: "xl",
						fontWeight: "bold"
					})}
				>
					{(validator.moniker || "V")[0].toUpperCase()}
				</div>
				<div>
					<h1
						className={css({
							fontSize: "2xl",
							fontWeight: "bold",
							display: "flex",
							alignItems: "center",
							gap: "3"
						})}
					>
						{validator.moniker || "Unknown Validator"}
						<ValidatorStatusBadge validator={validator} />
					</h1>
					<p
						className={css({
							color: "fg.muted",
							fontFamily: "mono",
							fontSize: "sm"
						})}
					>
						{validator.operator_address}
					</p>
				</div>
			</div>

			<div
				className={css({
					display: "grid",
					gap: "5",
					gridTemplateColumns: { base: "1fr", lg: "repeat(2, 1fr)" }
				})}
			>
				<Card>
					<CardHeader>
						<CardTitle>Validator Details</CardTitle>
					</CardHeader>
					<CardContent>
						<div
							className={css({
								display: "flex",
								flexDirection: "column",
								gap: "4"
							})}
						>
							<div
								className={css({
									display: "flex",
									justifyContent: "space-between"
								})}
							>
								<span className={css({ color: "fg.muted" })}>Voting Power</span>
								<span className={css({ fontWeight: "medium" })}>
									{formatTokens(validator.tokens)}
								</span>
							</div>
							<div
								className={css({
									display: "flex",
									justifyContent: "space-between"
								})}
							>
								<span className={css({ color: "fg.muted" })}>
									Commission Rate
								</span>
								<span className={css({ fontWeight: "medium" })}>
									{validator.commission_rate
										? `${(parseFloat(validator.commission_rate) * 100).toFixed(2)}%`
										: "-"}
								</span>
							</div>
							<div
								className={css({
									display: "flex",
									justifyContent: "space-between"
								})}
							>
								<span className={css({ color: "fg.muted" })}>Status</span>
								<span className={css({ fontWeight: "medium" })}>
									{validator.status?.replace("BOND_STATUS_", "") || "Unknown"}
								</span>
							</div>
							<div
								className={css({
									display: "flex",
									justifyContent: "space-between"
								})}
							>
								<span className={css({ color: "fg.muted" })}>Jailed</span>
								<span className={css({ fontWeight: "medium" })}>
									{validator.jailed ? "Yes" : "No"}
								</span>
							</div>
							{validator.website && (
								<div
									className={css({
										display: "flex",
										justifyContent: "space-between"
									})}
								>
									<span className={css({ color: "fg.muted" })}>Website</span>
									<a
										href={validator.website}
										target="_blank"
										rel="noopener noreferrer"
										className={css({
											display: "flex",
											alignItems: "center",
											gap: "1",
											color: "accent.default",
											_hover: { textDecoration: "underline" }
										})}
									>
										<Globe className={css({ h: "3", w: "3" })} />
										{new URL(validator.website).hostname}
										<ExternalLink className={css({ h: "3", w: "3" })} />
									</a>
								</div>
							)}
							{validator.identity && (
								<div
									className={css({
										display: "flex",
										justifyContent: "space-between"
									})}
								>
									<span className={css({ color: "fg.muted" })}>Identity</span>
									<span className={css({ fontFamily: "mono", fontSize: "sm" })}>
										{validator.identity}
									</span>
								</div>
							)}
							{validator.details && (
								<div
									className={css({
										borderTop: "1px solid",
										borderTopColor: "border.default",
										pt: "4",
										mt: "2"
									})}
								>
									<span
										className={css({
											color: "fg.muted",
											display: "block",
											mb: "2"
										})}
									>
										Description
									</span>
									<p className={css({ fontSize: "sm" })}>{validator.details}</p>
								</div>
							)}
							<div
								className={css({
									display: "flex",
									justifyContent: "space-between"
								})}
							>
								<span className={css({ color: "fg.muted" })}>Last Updated</span>
								<span className={css({ fontSize: "sm" })}>
									{validator.updated_at
										? formatTimeAgo(validator.updated_at)
										: "-"}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Jailing History</CardTitle>
					</CardHeader>
					<CardContent>
						<ValidatorJailingHistory
							operatorAddress={validator.operator_address}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
