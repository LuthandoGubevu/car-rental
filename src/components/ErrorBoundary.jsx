import { Component } from 'react';

// Without this, a crash anywhere below (Firebase SDK init failures included -
// e.g. an unauthorized domain rejecting Auth's startup config fetch) unmounts
// the whole tree silently, leaving a blank page with no clue why.
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error rendering the app:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page-loading">
          <p>Something went wrong loading the app.</p>
          <p className="muted" style={{ fontSize: 13 }}>{String(this.state.error?.message || this.state.error)}</p>
          <button className="btn-secondary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
