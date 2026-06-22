import { FormEvent, useEffect, useState } from "react";
import { ApiKeyStatus } from "../components/ApiKeyStatus";
import { getApiKey, saveApiKey } from "../services/storage";

type SaveState = "idle" | "saving" | "saved" | "error";

export function Options() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    getApiKey()
      .then(setApiKey)
      .catch(() => setSaveState("error"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveState("saving");

    try {
      await saveApiKey(apiKey);
      setApiKey(apiKey.trim());
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <main className="options-shell">
      <header className="app-header">
        <span className="eyebrow">GoalWatch</span>
        <h1>Settings</h1>
        <p>Add the API key that will power live scores in Phase 2.</p>
      </header>

      <section className="card settings-card">
        <ApiKeyStatus configured={Boolean(apiKey.trim())} loading={loading} />

        <form onSubmit={handleSubmit}>
          <label htmlFor="api-key">Football API key</label>
          <input
            id="api-key"
            name="api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setSaveState("idle");
            }}
            disabled={loading}
            placeholder="Enter your API key"
          />
          <p className="field-hint">Stored only in this browser using Chrome local storage.</p>

          <button className="button" type="submit" disabled={loading || saveState === "saving"}>
            {saveState === "saving" ? "Saving…" : "Save API key"}
          </button>

          {saveState === "saved" && (
            <p className="message message--success" role="status">API key saved.</p>
          )}
          {saveState === "error" && (
            <p className="message message--error" role="alert">Unable to access extension storage.</p>
          )}
        </form>
      </section>
    </main>
  );
}

