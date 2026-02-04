/**
 * Error Boundary for Wallet components
 * Catches errors from wallet SDK dynamic imports and renders nothing
 */

import { Component, type ReactNode } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
}

export class WalletErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(): State {
		return { hasError: true }
	}

	componentDidCatch(error: Error, info: { componentStack: string }) {
		// Log wallet-related errors silently - these are expected when dynamic imports fail
		console.warn('Wallet component error (dynamic import may have failed):', error.message)
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback ?? null
		}

		return this.props.children
	}
}
