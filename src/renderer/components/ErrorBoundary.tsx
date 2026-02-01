import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
          <div className="w-16 h-16 mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            An unexpected error occurred. Try reloading the app.
          </p>
          {this.state.error && (
            <pre className="text-xs bg-white/5 rounded-lg p-4 mb-6 max-w-lg overflow-auto text-red-400">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleReload} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reload App
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
