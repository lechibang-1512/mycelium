import React from 'react';

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child component tree.
 * Displays a fallback UI instead of crashing the entire application.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="container mt-5">
                    <div className="alert alert-danger">
                        <h4 className="alert-heading">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Something went wrong
                        </h4>
                        <p>An error occurred while rendering this page.</p>
                        <hr />
                        <button className="btn btn-primary" onClick={this.handleReload}>
                            <i className="fas fa-sync-alt me-2"></i>
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
