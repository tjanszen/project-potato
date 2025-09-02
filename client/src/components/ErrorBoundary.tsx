import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#ffe0e0',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ color: '#d63031', marginTop: 0 }}>Something went wrong!</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              Click for error details
            </summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              padding: '10px 20px',
              backgroundColor: '#74b9ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}