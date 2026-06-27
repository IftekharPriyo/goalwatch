import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiKeyStatus } from "../components/ApiKeyStatus";
import { MatchCard } from "../components/MatchCard";
import {
  getLiveMatches,
} from "../services/footballApi";
import { getPublishedWorldCupFixtures } from "../services/schedule";
import {
  getApiKey,
  getFixtureCache,
  saveFixtureCache,
} from "../services/storage";
import type { WorldCupFixture } from "../types/football";

type Tab = "upcoming" | "live" | "past";
type RequestState = "idle" | "loading" | "error";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const ACTIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"]);
const FIFA_WORLD_CUP_SEASON = 2026;
const LIVE_WINDOW_BEFORE_MS = 15 * 60 * 1000;
const LIVE_WINDOW_AFTER_MS = 3 * 60 * 60 * 1000;

function isInExpectedLiveWindow(fixture: WorldCupFixture, now = Date.now()) {
  const kickoff = new Date(fixture.kickoff).getTime();
  return now >= kickoff - LIVE_WINDOW_BEFORE_MS && now <= kickoff + LIVE_WINDOW_AFTER_MS;
}

export function Popup() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [fixtures, setFixtures] = useState<WorldCupFixture[]>([]);
  const [configured, setConfigured] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [scheduleState, setScheduleState] = useState<RequestState>("loading");
  const [liveState, setLiveState] = useState<RequestState>("idle");
  const [liveChecked, setLiveChecked] = useState(false);
  const [message, setMessage] = useState("");

  const refreshSchedule = useCallback(async () => {
    setScheduleState("loading");
    setMessage("");

    try {
      const published = await getPublishedWorldCupFixtures();
      const cache = {
        fixtures: published.fixtures,
        updatedAt: Date.now(),
        season: published.season,
      };
      await saveFixtureCache(cache);
      setFixtures(published.fixtures);
      setHasCache(true);
      setScheduleState("idle");
    } catch (error) {
      setScheduleState("error");
      setMessage(error instanceof Error ? error.message : "Unable to refresh the schedule.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [apiKey, cache] = await Promise.all([getApiKey(), getFixtureCache()]);
      setConfigured(Boolean(apiKey.trim()));

      if (cache?.season === FIFA_WORLD_CUP_SEASON) {
        setFixtures(cache.fixtures);
        setHasCache(true);
        setScheduleState("idle");
      } else {
        await refreshSchedule();
      }
    })();
  }, [refreshSchedule]);

  const upcoming = useMemo(
    () => fixtures.filter((fixture) => !FINISHED_STATUSES.has(fixture.statusShort) && new Date(fixture.kickoff).getTime() > Date.now()),
    [fixtures],
  );
  const past = useMemo(
    () => fixtures.filter((fixture) => FINISHED_STATUSES.has(fixture.statusShort)).reverse(),
    [fixtures],
  );
  const expectedLive = useMemo(
    () => fixtures.filter((fixture) => !FINISHED_STATUSES.has(fixture.statusShort) && isInExpectedLiveWindow(fixture)),
    [fixtures],
  );
  const [live, setLive] = useState<WorldCupFixture[]>([]);

  const loadLive = useCallback(async () => {
    if (!hasCache || expectedLive.length === 0) {
      setLive([]);
      setLiveChecked(false);
      setLiveState("idle");
      return;
    }

    setLiveChecked(true);
    setLiveState("loading");
    setMessage("");
    try {
      const matches = await getLiveMatches();
      setLive(matches.filter((match) => ACTIVE_STATUSES.has(match.statusShort)));
      setLiveState("idle");
    } catch (error) {
      setLiveState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load live matches.");
    }
  }, [expectedLive.length, hasCache]);

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    setMessage("");
    if (nextTab === "live") void loadLive();
  };

  const openSettings = () => void chrome.runtime.openOptionsPage();
  const displayed = tab === "upcoming" ? upcoming : tab === "past" ? past : live;

  return (
    <main className="popup-shell">
      <header className="app-header">
        <span className="eyebrow">Football at a glance</span>
        <h1>GoalWatch</h1>
      </header>

      <nav className="tab-bar" aria-label="Match views">
        {(["upcoming", "live", "past"] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? "tab tab--active" : "tab"} type="button" onClick={() => selectTab(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      <section className="status-strip" aria-label="API key configuration">
        <ApiKeyStatus configured={configured} loading={false} />
        {!configured && <button className="text-button" type="button" onClick={openSettings}>Configure</button>}
      </section>

      <section className="matches-section" aria-live="polite">
        <div className="section-heading">
          <h2>{tab === "upcoming" ? "Upcoming World Cup" : tab === "past" ? "Past matches" : "Live now"}</h2>
          {tab === "live" ? (
            <button className="text-button" type="button" disabled={liveState === "loading"} onClick={() => void loadLive()}>Refresh</button>
          ) : tab === "upcoming" ? (
            <button className="text-button" type="button" disabled={scheduleState === "loading"} onClick={() => void refreshSchedule()}>Refresh schedule</button>
          ) : null}
        </div>

        {(scheduleState === "loading" || liveState === "loading") && <div className="card state-panel"><span className="spinner" /><p>Loading matches…</p></div>}
        {message && <div className="card state-panel"><p className="message message--error" role="alert">{message}</p></div>}
        {!hasCache && scheduleState !== "loading" && !message && <div className="card state-panel"><p>Refresh the shared World Cup schedule to get started.</p></div>}
        {hasCache && tab === "live" && expectedLive.length === 0 && !liveChecked && liveState !== "loading" && <div className="card state-panel"><p>No World Cup match is scheduled right now. No API request was made.</p></div>}
        {hasCache && tab === "live" && liveChecked && liveState === "idle" && live.length === 0 && <div className="card state-panel"><p>No World Cup match is currently reported live.</p></div>}
        {hasCache && tab !== "live" && displayed.length === 0 && scheduleState !== "loading" && <div className="card state-panel"><p>No {tab} matches found.</p></div>}
        {displayed.length > 0 && liveState !== "loading" && scheduleState !== "loading" && (
          <div className="matches-list">{displayed.map((match) => <MatchCard key={match.id} match={match} showKickoff={tab !== "live"} />)}</div>
        )}
      </section>
    </main>
  );
}
