'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home, Mail, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { captureError } from '@/lib/error-handling/errorTracker';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 
   * Whether to show a button to report the error
   * @default true
   */
  showReportButton?: boolean;
  /**
   * Whether to show a button to reset the error boundary
   * @default true
   */
  showResetButton?: boolean;
  /**
   * Whether to show a button to go to the home page
   * @default true
   */
  showHomeButton?: boolean;
  /**
   * Custom error message to display
   */
  errorMessage?: string;
  /**
   * Custom error title
   */
  errorTitle?: string;
  /**
   * Additional context to include with the error
   */
  errorContext?: Record<string, any>;
  /**
   * Component to render when an error occurs
   * Receives error and resetErrorBoundary as props
   */
  fallbackComponent?: React.ComponentType<{ 
    error: Error; 
    resetErrorBoundary: () => void;
  }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Track the error with additional context
    captureError(error, { 
      componentStack: errorInfo.componentStack,
      boundary: 'ErrorBoundary',
      ...this.props.errorContext,
    });

    // Update state with error info
    this.setState({ error, errorInfo });
    
    // Call the onError handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call any additional reset logic
    if (this.props.onError) {
      this.props.onError(new Error('Error boundary reset'), {
        componentStack: '',
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };
  
  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    const errorData = {
      name: error?.name || 'Unknown Error',
      message: error?.message || 'No error message',
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || '',
      ...this.props.errorContext,
    };
    
    // In a real app, you would send this to your error reporting service
    // For now, we'll just log it and show a message
    console.log('Error report:', errorData);
    
    // You could also open a mailto link with the error details
    const subject = encodeURIComponent(`Error Report: ${errorData.name}`);
    const body = encodeURIComponent(
      `Please describe what you were doing when the error occurred:\n\n` +
      `Error Details:\n${JSON.stringify(errorData, null, 2)}`
    );
    
    window.open(`mailto:support@bordershop.com?subject=${subject}&body=${body}`);
  };

  public render() {
    const { 
      fallback, 
      fallbackComponent: FallbackComponent,
      showReportButton = true,
      showResetButton = true,
      showHomeButton = true,
      errorMessage = 'An unexpected error occurred. Our team has been notified.',
      errorTitle = 'Something went wrong',
    } = this.props;
    
    const { hasError, error, errorInfo } = this.state;
    
    if (hasError) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return <FallbackComponent error={error!} resetErrorBoundary={this.handleReset} />;
      }
      
      // Use custom fallback UI if provided
      if (fallback) {
        return fallback;
      }
      
      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {errorTitle}
              </h1>
              <p className="text-muted-foreground">
                {errorMessage}
              </p>
            </div>
            
            <div className="space-y-4">
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-muted/50 p-4 rounded-lg border border-border overflow-hidden">
                  <details>
                    <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
                      Error details
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="p-3 bg-background rounded text-sm font-mono overflow-auto">
                        <p className="font-semibold">{error.name}: {error.message}</p>
                        {error.stack && (
                          <pre className="mt-2 text-xs opacity-80">
                            {error.stack.split('\n').slice(1).join('\n')}
                          </pre>
                        )}
                        {errorInfo?.componentStack && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold">Component Stack:</p>
                            <pre className="mt-1 text-xs opacity-80">
                              {errorInfo.componentStack.trim()}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {showResetButton && (
                  <Button 
                    onClick={this.handleReset} 
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try again
                  </Button>
                )}
                
                {showHomeButton && (
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Home className="mr-2 h-4 w-4" />
                      Go to home
                    </Button>
                  </Link>
                )}
                
                {showReportButton && process.env.NODE_ENV === 'production' && (
                  <Button 
                    onClick={this.handleReportError}
                    variant="outline"
                    className="flex-1"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Report issue
                  </Button>
                )}
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="pt-4 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={this.handleReload}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Reload app
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher order component for error boundaries
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    FallbackComponent?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    errorTitle?: string;
    errorMessage?: string;
    showReportButton?: boolean;
    showResetButton?: boolean;
    showHomeButton?: boolean;
    errorContext?: Record<string, any>;
  } = {}
) {
  return function WrappedComponent(props: T) {
    const { 
      FallbackComponent, 
      onError, 
      errorTitle, 
      errorMessage, 
      showReportButton,
      showResetButton,
      showHomeButton,
      errorContext,
    } = options;
    
    return (
      <ErrorBoundary
        fallbackComponent={FallbackComponent}
        onError={onError}
        errorTitle={errorTitle}
        errorMessage={errorMessage}
        showReportButton={showReportButton}
        showResetButton={showResetButton}
        showHomeButton={showHomeButton}
        errorContext={errorContext}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Error boundary for page components
export function withPageErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: Omit<Parameters<typeof withErrorBoundary>[1], 'showHomeButton'> = {}
) {
  return withErrorBoundary(Component, {
    showHomeButton: true,
    errorTitle: 'Page Error',
    errorMessage: 'An error occurred while loading this page. Please try again or return home.',
    ...options,
  });
}

// Error boundary for form components
export function withFormErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: Omit<Parameters<typeof withErrorBoundary>[1], 'errorTitle' | 'errorMessage'> = {}
) {
  return withErrorBoundary(Component, {
    errorTitle: 'Form Error',
    errorMessage: 'An error occurred while processing the form. Please try again.',
    showResetButton: true,
    showHomeButton: false,
    ...options,
  });
}

// Error boundary for data fetching components
export function withDataErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: Omit<Parameters<typeof withErrorBoundary>[1], 'errorTitle' | 'errorMessage'> = {}
) {
  return withErrorBoundary(Component, {
    errorTitle: 'Data Error',
    errorMessage: 'Failed to load data. Please try again or contact support if the problem persists.',
    showResetButton: true,
    showHomeButton: true,
    ...options,
  });
}
