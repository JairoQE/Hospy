import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container page">
          <h1>Algo salió mal</h1>
          <p className="error-msg">{this.state.error.message}</p>
          <Link to="/" className="btn btn-primary">
            Volver al inicio
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
