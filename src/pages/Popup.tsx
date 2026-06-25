import { useCallback, useEffect, useState } from "react";
import { ApiKeyStatus } from "../components/ApiKeyStatus";
import { MatchCard } from "../components/MatchCard";
import { FootballApiError, getLiveMatches } from "../services/footballApi";
import type { LiveMatch } from "../types/football";

type PopupState =
  | { status: "loading" }
  | { status: "missing-key" }
  | { status: "error"; message: string }
  | { status: "ready"; matches: LiveMatch[] };

export function Popup() {
  const [state, setState] = useState<PopupState>({ status: "loading" });

  const loadMatches = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const matches = await getLiveMatches();
      setState({ status: "ready", matches });
    } catch (error) {
      if (error instanceof FootballApiError && error.code === "missing-key") {
        setState({ status: "missing-key" });
        return;
      }

      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to load live matches right now.",
      });
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

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
        <ApiKeyStatus
          configured={state.status !== "missing-key"}
          loading={state.status === "loading"}
        />
        {state.status === "missing-key" && (
          <p className="message">Add an API-FOOTBALL key to start loading live scores.</p>
        )}
        {state.status === "missing-key" && (
          <button className="button button--secondary" type="button" onClick={openSettings}>
            Configure API key
          </button>
        )}
      </section>

      <section className="matches-section" aria-labelledby="matches-heading" aria-live="polite">
        <div className="section-heading">
          <h2 id="matches-heading">World Cup live</h2>
          {state.status === "ready" && (
            <button className="text-button" type="button" onClick={() => void loadMatches()}>
              Refresh
            </button>
          )}
        </div>

        {state.status === "loading" && (
          <div className="card state-panel">
            <span className="spinner" aria-hidden="true" />
            <p>Loading live matches…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="card state-panel">
            <p className="message message--error" role="alert">{state.message}</p>
            <button className="button button--secondary" type="button" onClick={() => void loadMatches()}>
              Try again
            </button>
          </div>
        )}

        {state.status === "missing-key" && (
          <div className="card state-panel">
            <div className="placeholder-icon" aria-hidden="true">⚽</div>
            <p>Live matches will appear here after setup.</p>
          </div>
        )}

        {state.status === "ready" && state.matches.length === 0 && (
          <div className="card state-panel">
            <div className="placeholder-icon" aria-hidden="true">⚽</div>
            <p>No World Cup matches are live right now.</p>
          </div>
        )}

        {state.status === "ready" && state.matches.length > 0 && (
          <div className="matches-list">
            {state.matches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        )}
      </section>
    </main>
  );
}

