import React from "react";
import { ServerAPIService } from "../utils/ServerAPI";

interface ErrorBoundaryProps {
  api: ServerAPIService;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.api.error(`${error.message}\n${info.componentStack}`);
  }

  render() {
    return this.props.children;
  }
}
