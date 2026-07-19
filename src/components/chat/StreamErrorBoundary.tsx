"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  content: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Keeps the chat tree alive if streaming render throws.
 * Falls back to plain text of the current stream content.
 */
export class StreamErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("StreamingBubble render error:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.content !== this.props.content) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-w-0 w-full justify-start">
          <div className="min-w-0 w-full max-w-full overflow-hidden px-0 py-1 sm:px-1">
            <pre className="m-0 min-w-0 w-full max-w-full overflow-x-hidden whitespace-pre-wrap break-words font-mono text-[0.8125rem] leading-relaxed text-foreground">
              {this.props.content}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
