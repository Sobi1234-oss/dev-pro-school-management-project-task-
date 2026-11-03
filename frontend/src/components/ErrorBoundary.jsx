import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error('UI crash:', err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-chalk p-6 text-center">
        <div>
          <h1 className="text-2xl font-extrabold">Something broke on this page</h1>
          <p className="mt-2 text-sm text-ink/60">Your data is safe. Reload to continue.</p>
          <button onClick={() => window.location.assign(import.meta.env.BASE_URL)} className="mt-5 h-11 rounded-lg bg-ink px-5 text-sm font-semibold text-white">Reload</button>
        </div>
      </div>
    );
  }
}
