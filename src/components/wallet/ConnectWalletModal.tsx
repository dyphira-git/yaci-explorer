/**
 * Connect Wallet Modal - Choose between Keplr and EVM wallets
 */

import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Wallet, X } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { css } from '@/styled-system/css'

interface ConnectWalletModalProps {
	isOpen: boolean
	onClose: () => void
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
	const { connectKeplr, connectEvm, isConnecting, error } = useWallet()

	const handleKeplrConnect = useCallback(async () => {
		await connectKeplr()
		onClose()
	}, [connectKeplr, onClose])

	const handleEvmConnect = useCallback(() => {
		connectEvm()
		onClose()
	}, [connectEvm, onClose])

	if (!isOpen) return null

	// Use portal to render modal at document body level, breaking out of header's stacking context
	return createPortal(
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={e => e.stopPropagation()}>
				<div className={styles.header}>
					<h2 className={styles.title}>Connect Wallet</h2>
					<button type="button" className={styles.closeButton} onClick={onClose}>
						<X size={20} />
					</button>
				</div>

					<div className={styles.content}>
					<p className={styles.description}>
						Connect your wallet to view your account activity and interact with the network.
					</p>

					{error && (
						<div className={styles.error}>
							{error}
						</div>
					)}

					<div className={styles.options}>
						<button
							type="button"
							className={styles.optionButton}
							onClick={handleKeplrConnect}
							disabled={isConnecting}
						>
							<div className={styles.optionIcon}>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
								</svg>
							</div>
							<div className={styles.optionInfo}>
								<span className={styles.optionName}>Keplr Wallet</span>
								<span className={styles.optionDesc}>Cosmos ecosystem wallet</span>
							</div>
						</button>

						<button
							type="button"
							className={styles.optionButton}
							onClick={handleEvmConnect}
							disabled={isConnecting}
						>
							<div className={styles.optionIcon}>
								<Wallet size={24} />
							</div>
							<div className={styles.optionInfo}>
								<span className={styles.optionName}>Browser Wallet</span>
								<span className={styles.optionDesc}>MetaMask, Rabby, etc.</span>
							</div>
						</button>
					</div>

					<p className={styles.note}>
						Both wallet types access the same account on Republic AI network.
					</p>
				</div>
			</div>
		</div>,
		document.body
	)
}

const styles = {
	overlay: css({
		position: 'fixed',
		inset: 0,
		bg: 'rgba(0, 0, 0, 0.7)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 100,
		backdropFilter: 'blur(4px)',
		p: '4',
		overflow: 'auto',
	}),
	modal: css({
		bg: 'bg.default',
		borderRadius: 'xl',
		border: '1px solid',
		borderColor: 'border.default',
		w: 'full',
		maxW: '400px',
		maxH: '90vh',
		overflow: 'auto',
		my: 'auto',
	}),
	header: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		px: '6',
		py: '4',
		borderBottom: '1px solid',
		borderColor: 'border.default',
	}),
	title: css({
		fontSize: 'lg',
		fontWeight: 'semibold',
	}),
	closeButton: css({
		p: '1',
		borderRadius: 'md',
		color: 'fg.muted',
		cursor: 'pointer',
		transition: 'colors 0.2s',
		_hover: {
			color: 'fg.default',
			bg: 'bg.subtle',
		},
	}),
	content: css({
		p: '6',
	}),
	description: css({
		color: 'fg.muted',
		fontSize: 'sm',
		mb: '4',
	}),
	error: css({
		bg: 'red.950',
		color: 'red.300',
		px: '4',
		py: '3',
		borderRadius: 'lg',
		fontSize: 'sm',
		mb: '4',
		border: '1px solid',
		borderColor: 'red.800',
	}),
	options: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '3',
	}),
	optionButton: css({
		display: 'flex',
		alignItems: 'center',
		gap: '4',
		w: 'full',
		p: '4',
		bg: 'bg.subtle',
		border: '1px solid',
		borderColor: 'border.default',
		borderRadius: 'lg',
		cursor: 'pointer',
		transition: 'all 0.2s',
		_hover: {
			borderColor: 'accent.default',
			bg: 'bg.muted',
		},
		_disabled: {
			opacity: 0.5,
			cursor: 'not-allowed',
		},
	}),
	optionIcon: css({
		w: '10',
		h: '10',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		bg: 'bg.default',
		borderRadius: 'lg',
		color: 'accent.default',
	}),
	walletIcon: css({
		w: '6',
		h: '6',
	}),
	optionInfo: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
	}),
	optionName: css({
		fontWeight: 'medium',
	}),
	optionDesc: css({
		fontSize: 'sm',
		color: 'fg.muted',
	}),
	note: css({
		mt: '4',
		pt: '4',
		borderTop: '1px solid',
		borderColor: 'border.default',
		fontSize: 'xs',
		color: 'fg.subtle',
		textAlign: 'center',
	}),
}
