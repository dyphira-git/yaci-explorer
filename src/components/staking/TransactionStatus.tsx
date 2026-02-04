/**
 * Transaction Status Component
 * Shows the current status of a staking transaction
 */

import { Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { css } from '@/styled-system/css'
import type { TxStatus } from '@/hooks/useStaking'

interface TransactionStatusProps {
	status: TxStatus
	txHash: string | null
	error: string | null
	explorerUrl?: string
}

export function TransactionStatus({ status, txHash, error, explorerUrl }: TransactionStatusProps) {
	if (status === 'idle') return null

	const baseExplorer = explorerUrl || 'https://explorer.republicai.io'

	return (
		<div className={styles.container}>
			{status === 'pending' && (
				<div className={styles.row}>
					<Loader2 className={styles.spinningIcon} />
					<span>Waiting for confirmation...</span>
				</div>
			)}

			{status === 'success' && txHash && (
				<div className={styles.successRow}>
					<Check className={styles.successIcon} />
					<div className={styles.content}>
						<span className={styles.successText}>Transaction submitted</span>
						<a
							href={`${baseExplorer}/tx/${txHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className={styles.link}
						>
							View transaction
							<ExternalLink className={styles.linkIcon} />
						</a>
					</div>
				</div>
			)}

			{status === 'error' && error && (
				<div className={styles.errorRow}>
					<AlertCircle className={styles.errorIcon} />
					<span className={styles.errorText}>{error}</span>
				</div>
			)}
		</div>
	)
}

const styles = {
	container: css({
		mt: '4',
		p: '3',
		rounded: 'md',
		bg: 'bg.subtle',
	}),
	row: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		color: 'fg.muted',
	}),
	successRow: css({
		display: 'flex',
		alignItems: 'flex-start',
		gap: '2',
	}),
	errorRow: css({
		display: 'flex',
		alignItems: 'flex-start',
		gap: '2',
	}),
	content: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1',
	}),
	spinningIcon: css({
		w: '4',
		h: '4',
		animation: 'spin',
	}),
	successIcon: css({
		w: '4',
		h: '4',
		color: 'green.500',
		flexShrink: '0',
		mt: '0.5',
	}),
	errorIcon: css({
		w: '4',
		h: '4',
		color: 'red.500',
		flexShrink: '0',
		mt: '0.5',
	}),
	successText: css({
		color: 'green.500',
		fontWeight: 'medium',
	}),
	errorText: css({
		color: 'red.500',
		fontSize: 'sm',
	}),
	link: css({
		display: 'inline-flex',
		alignItems: 'center',
		gap: '1',
		fontSize: 'sm',
		color: 'accent.default',
		_hover: { textDecoration: 'underline' },
	}),
	linkIcon: css({
		w: '3',
		h: '3',
	}),
}
