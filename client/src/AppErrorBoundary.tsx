import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Избегаем «белый экран» при необработанной ошибке рендера: показываем сообщение и стек в dev.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          boxSizing: "border-box",
          minHeight: "100vh",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0d14",
          color: "#e8e2f5",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: "1.25rem" }}>Ошибка интерфейса</h1>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>{error.message}</p>
        {import.meta.env.DEV && error.stack ? (
          <details style={{ marginTop: "16px", opacity: 0.85 }}>
            <summary style={{ cursor: "pointer" }}>Стек вызова</summary>
            <pre style={{ margin: "12px 0 0", fontSize: "12px", overflow: "auto" }}>{error.stack}</pre>
          </details>
        ) : null}
        <button
          type="button"
          style={{
            marginTop: "20px",
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid #5da9b8",
            background: "#1a2330",
            color: "#e8e2f5",
            cursor: "pointer",
          }}
          onClick={() => window.location.reload()}
        >
          Перезагрузить страницу
        </button>
      </div>
    );
  }
}
