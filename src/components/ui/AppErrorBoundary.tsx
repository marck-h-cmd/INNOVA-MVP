import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorState } from './OverlayPrimitives';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Error inesperado en la vista.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('NEXO UNT boundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <ErrorState
            title="Error al renderizar este módulo"
            description={this.state.message}
            onRetry={() => this.setState({ hasError: false, message: '' })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
