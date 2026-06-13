/** @jsxImportSource preact */
import { Component, type ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an unhandled exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "2rem",
          margin: "3rem auto",
          maxWidth: "var(--max-w)",
          border: "1px solid #cf222e",
          background: "var(--surface)",
          color: "var(--text)",
          fontFamily: "var(--body)"
        }}>
          <h2 style={{ color: "#cf222e", fontWeight: 300, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
            Something went wrong.
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            The benchmark application encountered an unhandled runtime error.
          </p>
          <pre style={{
            background: "var(--bg)",
            padding: "1rem",
            fontSize: "0.8125rem",
            overflowX: "auto",
            border: "1px solid var(--border)",
            fontFamily: "var(--mono)",
            color: "#cf222e"
          }}>
            {this.state.error?.stack || this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 2rem",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.8125rem",
              letterSpacing: "0.02em"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
