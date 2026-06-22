interface ApiKeyStatusProps {
  configured: boolean;
  loading?: boolean;
}

export function ApiKeyStatus({ configured, loading = false }: ApiKeyStatusProps) {
  const label = loading ? "Checking…" : configured ? "Configured" : "Missing";
  const state = loading ? "loading" : configured ? "configured" : "missing";

  return (
    <div className="status-row">
      <span>API key status</span>
      <span className={`status-badge status-badge--${state}`}>{label}</span>
    </div>
  );
}

