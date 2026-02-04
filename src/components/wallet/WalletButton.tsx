/**
 * Wallet Button - Shows connection status and opens wallet modal/menu
 */

import { useState, useRef, useEffect } from 'react'
import { Wallet, ChevronDown, LogOut, Copy, Check, ExternalLink } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { ConnectWalletModal } from './ConnectWalletModal'
import { truncateAddress } from '@/lib/address'
import { css, cx } from '@/styled-system/css'

export function WalletButton() {
	const { isConnected, isConnecting, walletType, evmAddress, cosmosAddress, disconnect } = useWallet()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [copied, setCopied] = useState<'evm' | 'cosmos' | null>(null)
	const menuRef = useRef<HTMLDivElement>(null)

	// Close menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const copyToClipboard = async (text: string, type: 'evm' | 'cosmos') => {
		await navigator.clipboard.writeText(text)
		setCopied(type)
		setTimeout(() => setCopied(null), 2000)
	}

	const handleDisconnect = () => {
		disconnect()
		setIsMenuOpen(false)
	}

	// Not connected - show connect button
	if (!isConnected) {
		return (
			<>
				<button
					type="button"
					className={styles.connectButton}
					onClick={() => setIsModalOpen(true)}
					disabled={isConnecting}
				>
					<Wallet size={16} />
					<span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
				</button>
				<ConnectWalletModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
				/>
			</>
		)
	}

	// Connected - show address and dropdown
	const displayAddress = walletType === 'keplr' ? cosmosAddress : evmAddress

	return (
		<div className={styles.container} ref={menuRef}>
			<button
				type="button"
				className={styles.addressButton}
				onClick={() => setIsMenuOpen(!isMenuOpen)}
			>
				<div className={cx(styles.walletIndicator, walletType === 'keplr' ? styles.keplr : styles.evm)} />
				<span className={styles.address}>{truncateAddress(displayAddress || '', 6, 4)}</span>
				<ChevronDown size={14} className={cx(styles.chevron, isMenuOpen && styles.chevronOpen)} />
			</button>

			{isMenuOpen && (
				<div className={styles.dropdown}>
					<div className={styles.dropdownHeader}>
						<span className={styles.walletLabel}>
							{walletType === 'keplr' ? 'Keplr' : 'EVM'} Wallet
						</span>
					</div>

					{/* EVM Address */}
					{evmAddress && (
						<div className={styles.addressRow}>
							<span className={styles.addressLabel}>EVM</span>
							<span className={styles.addressValue}>{truncateAddress(evmAddress, 10, 6)}</span>
							<button
								type="button"
								className={styles.iconButton}
								onClick={() => copyToClipboard(evmAddress, 'evm')}
								title="Copy address"
							>
								{copied === 'evm' ? <Check size={14} /> : <Copy size={14} />}
							</button>
						</div>
					)}

					{/* Cosmos Address */}
					{cosmosAddress && (
						<div className={styles.addressRow}>
							<span className={styles.addressLabel}>Cosmos</span>
							<span className={styles.addressValue}>{truncateAddress(cosmosAddress, 10, 6)}</span>
							<button
								type="button"
								className={styles.iconButton}
								onClick={() => copyToClipboard(cosmosAddress, 'cosmos')}
								title="Copy address"
							>
								{copied === 'cosmos' ? <Check size={14} /> : <Copy size={14} />}
							</button>
						</div>
					)}

					<div className={styles.divider} />

					{/* View in Explorer */}
					{evmAddress && (
						<a
							href={`/addr/${evmAddress}`}
							className={styles.menuItem}
							onClick={() => setIsMenuOpen(false)}
						>
							<ExternalLink size={14} />
							<span>View in Explorer</span>
						</a>
					)}

					{/* Disconnect */}
					<button
						type="button"
						className={cx(styles.menuItem, styles.disconnectItem)}
						onClick={handleDisconnect}
					>
						<LogOut size={14} />
						<span>Disconnect</span>
					</button>
				</div>
			)}
		</div>
	)
}

const styles = {
	container: css({
		position: 'relative',
	}),
	connectButton: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		px: '4',
		py: '2',
		bg: 'transparent',
		color: 'fg.muted',
		borderRadius: 'lg',
		fontSize: 'sm',
		fontWeight: 'medium',
		cursor: 'pointer',
		transition: 'all 0.2s',
		border: '1px solid',
		borderColor: 'border.default',
		_hover: {
			borderColor: 'border.emphasized',
			color: 'fg.default',
			bg: 'bg.subtle',
		},
		_disabled: {
			opacity: 0.7,
			cursor: 'not-allowed',
		},
	}),
	addressButton: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		px: '3',
		py: '2',
		bg: 'bg.subtle',
		border: '1px solid',
		borderColor: 'border.default',
		borderRadius: 'lg',
		fontSize: 'sm',
		cursor: 'pointer',
		transition: 'all 0.2s',
		_hover: {
			borderColor: 'border.emphasized',
			bg: 'bg.muted',
		},
	}),
	walletIndicator: css({
		w: '2',
		h: '2',
		borderRadius: 'full',
	}),
	keplr: css({
		bg: '#7B68EE', // Keplr purple
	}),
	evm: css({
		bg: '#F6851B', // MetaMask orange
	}),
	address: css({
		fontFamily: 'mono',
	}),
	chevron: css({
		color: 'fg.muted',
		transition: 'transform 0.2s',
	}),
	chevronOpen: css({
		transform: 'rotate(180deg)',
	}),
	dropdown: css({
		position: 'absolute',
		top: 'calc(100% + 8px)',
		right: '0',
		w: '280px',
		bg: 'bg.default',
		border: '1px solid',
		borderColor: 'border.default',
		borderRadius: 'lg',
		boxShadow: 'lg',
		overflow: 'hidden',
		zIndex: 50,
	}),
	dropdownHeader: css({
		px: '4',
		py: '3',
		borderBottom: '1px solid',
		borderColor: 'border.default',
	}),
	walletLabel: css({
		fontSize: 'xs',
		fontWeight: 'medium',
		color: 'fg.muted',
		textTransform: 'uppercase',
		letterSpacing: 'wide',
	}),
	addressRow: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		px: '4',
		py: '2',
	}),
	addressLabel: css({
		fontSize: 'xs',
		color: 'fg.subtle',
		w: '14',
	}),
	addressValue: css({
		flex: 1,
		fontSize: 'sm',
		fontFamily: 'mono',
		color: 'fg.muted',
	}),
	iconButton: css({
		p: '1',
		color: 'fg.muted',
		borderRadius: 'md',
		cursor: 'pointer',
		transition: 'colors 0.2s',
		_hover: {
			color: 'fg.default',
			bg: 'bg.subtle',
		},
	}),
	divider: css({
		h: '1px',
		bg: 'border.default',
		my: '1',
	}),
	menuItem: css({
		display: 'flex',
		alignItems: 'center',
		gap: '2',
		w: 'full',
		px: '4',
		py: '2.5',
		fontSize: 'sm',
		color: 'fg.muted',
		cursor: 'pointer',
		transition: 'colors 0.2s',
		textDecoration: 'none',
		_hover: {
			bg: 'bg.subtle',
			color: 'fg.default',
		},
	}),
	disconnectItem: css({
		color: 'red.400',
		_hover: {
			bg: 'red.950',
			color: 'red.300',
		},
	}),
}
