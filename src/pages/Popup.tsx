import { useEffect, useState } from "react";
import { ApiKeyStatus } from "../components/ApiKeyStatus";
import { getApiKey } from "../services/storage";

export function Popup() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getApiKey()
      .then((apiKey) => setConfigured(Boolean(apiKey)))
      .catch(() => setError("Unable to read extension settings."))
      .finally(() => setLoading(false));
  }, []);

  const openSettings = () => {
    void chrome.runtime.openOptionsPage();
  };

  return (
    <main className="popup-shell">
      <header className="app-header">
        <span className="eyebrow">Football at a glance</span>
        <h1>GoalWatch</h1>
        <p>Live scores without the noise.</p>
      </header>

      <section className="card" aria-label="API key configuration">
        <ApiKeyStatus configured={configured} loading={loading} />
        {error && <p className="message message--error">{error}</p>}
        {!loading && !configured && !error && (
          <button className="button button--secondary" type="button" onClick={openSettings}>
            Configure API key
          </button>
        )}
      </section>

      <section className="card matches-placeholder" aria-labelledby="matches-heading">
        <div className="placeholder-icon" aria-hidden="true">⚽</div>
        <h2 id="matches-heading">Live matches</h2>
        <p>Match scores will appear here when API integration arrives in Phase 2.</p>
      </section>
    </main>
  );
}

