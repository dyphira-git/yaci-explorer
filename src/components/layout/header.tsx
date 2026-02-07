import { Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { SearchBar } from '@/components/common/search-bar'
import { WalletButton } from '@/components/wallet/WalletButton'
import { WalletErrorBoundary } from '@/components/wallet/WalletErrorBoundary'
import { getBrandingConfig } from '@/config/branding'
import { css, cx } from '@/styled-system/css'
import { RepublicLogo } from '@/components/icons/icons'
import { api } from '@/lib/api'

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Blocks', href: '/blocks' },
  { name: 'Transactions', href: '/tx' },
  { name: 'Validators', href: '/validators' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Compute', href: '/compute' },
  { name: 'EVM', href: '/evm/contracts' },
]

/**
 * Computes how far behind the latest indexed block is from current time.
 * @returns Human-readable lag string and severity level, or null if synced.
 */
function computeSyncLag(blockTime: string): { label: string; severity: 'warning' | 'critical' } | null {
  const blockDate = new Date(blockTime)
  const now = new Date()
  const lagSeconds = Math.floor((now.getTime() - blockDate.getTime()) / 1000)

  // Consider synced if within 60 seconds
  if (lagSeconds < 60) return null

  const lagMinutes = Math.floor(lagSeconds / 60)
  const lagHours = Math.floor(lagMinutes / 60)
  const lagDays = Math.floor(lagHours / 24)

  let label: string
  if (lagDays > 0) {
    label = `${lagDays}d ${lagHours % 24}h behind`
  } else if (lagHours > 0) {
    label = `${lagHours}h ${lagMinutes % 60}m behind`
  } else {
    label = `${lagMinutes}m behind`
  }

  const severity = lagMinutes >= 30 ? 'critical' : 'warning'
  return { label, severity }
}

/** Pulsing sync status indicator shown when the indexer is behind chain tip. */
function SyncIndicator() {
  const [now, setNow] = useState(Date.now())

  // Tick every 10s to re-evaluate lag against wall clock
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(interval)
  }, [])

  const { data: latestBlock } = useQuery({
    queryKey: ['sync-status-block'],
    queryFn: () => api.getLatestBlock(),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  if (!latestBlock) return null

  const blockTime = latestBlock.data?.block?.header?.time
  if (!blockTime) return null

  const lag = computeSyncLag(blockTime)
  if (!lag) return null

  const isCritical = lag.severity === 'critical'

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '1.5',
        px: '2.5',
        py: '1',
        rounded: 'full',
        fontSize: 'xs',
        fontWeight: 'semibold',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        bg: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
        color: isCritical ? '#fca5a5' : '#fcd34d',
        border: '1px solid',
        borderColor: isCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
        flexShrink: 0,
      })}
      title={`Latest indexed block: ${latestBlock.id?.toLocaleString()} (${blockTime})`}
    >
      <span
        className={css({
          w: '2',
          h: '2',
          rounded: 'full',
          bg: isCritical ? '#ef4444' : '#f59e0b',
          animation: 'pulse 2s ease-in-out infinite',
          flexShrink: 0,
        })}
      />
      Syncing - {lag.label}
    </div>
  )
}

export function Header() {
  const location = useLocation()
  const pathname = location.pathname
  const branding = getBrandingConfig()

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.left}>
            <Link to="/" className={styles.brand}>
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className={styles.logo} />
              ) : (
                <RepublicLogo className={styles.logo} />
              )}
              <span className={styles.brandNameFull}>{branding.appName}</span>
              <span className={styles.brandNameShort}>{branding.appNameShort}</span>
            </Link>

            <nav className={styles.nav}>
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cx(styles.navLink, isActive ? styles.navLinkActive : styles.navLinkInactive)}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          <SyncIndicator />

          <div className={styles.right}>
            <SearchBar />
            <WalletErrorBoundary>
              <WalletButton />
            </WalletErrorBoundary>
          </div>
        </div>
      </div>
    </header>
  )
}

const styles = {
  header: css({
    position: 'sticky',
    top: '0',
    zIndex: '50',
    w: 'full',
    bg: 'bg.default/95',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid transparent',
    backgroundImage: 'linear-gradient(bg.default/95, bg.default/95), linear-gradient(90deg, rgba(204,204,204,0) 0%, #707B92 20%, #707B92 80%, rgba(153,153,153,0) 100%)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
  }),
  container: css({
    maxW: '7xl',
    mx: 'auto',
    px: '4',
  }),
  inner: css({
    display: 'flex',
    h: '16',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  left: css({
    display: 'flex',
    alignItems: 'center',
    gap: '6',
  }),
  right: css({
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    ml: '8',
    flexShrink: 0,
  }),
  brand: css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
  }),
  logo: css({
    h: '8',
    w: '8',
  }),
  logoPlaceholder: css({
    h: '8',
    w: '8',
    rounded: 'full',
    bg: 'accent.default',
  }),
  brandNameFull: css({
    fontSize: 'xl',
    fontWeight: 'bold',
    display: { base: 'none', sm: 'inline' },
  }),
  brandNameShort: css({
    fontSize: 'xl',
    fontWeight: 'bold',
    display: { base: 'inline', sm: 'none' },
  }),
  nav: css({
    display: { base: 'none', md: 'flex' },
    alignItems: 'center',
    gap: '4',
    fontSize: 'sm',
    fontWeight: 'medium',
  }),
  navLink: css({
    display: 'flex',
    alignItems: 'center',
    transition: 'colors',
    whiteSpace: 'nowrap',
  }),
  navLinkActive: css({
    color: '#FFFFFF',
    position: 'relative',
    _after: {
      content: '""',
      position: 'absolute',
      bottom: '-2px',
      left: '0',
      right: '0',
      h: '2px',
      bg: 'accent.default',
      opacity: '0.5',
    },
  }),
  navLinkInactive: css({
    color: 'rgba(221, 244, 255, 0.75)',
    transition: 'color 0.2s ease',
    _hover: { color: '#FFFFFF' },
  }),
}
