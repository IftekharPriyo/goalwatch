import { useCallback, useEffect, useMemo, useState } from "react";
import { MatchCard } from "../components/MatchCard";
import {
  getLiveMatches,
} from "../services/footballApi";
import { getPublishedWorldCupFixtures } from "../services/schedule";
import {
  getApiKey,
  getFixtureCache,
  hasSeenApiKeyPrompt,
  markApiKeyPromptSeen,
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
const PROVIDER_KICKOFF_TOLERANCE_MS = 6 * 60 * 60 * 1000;

function isInExpectedLiveWindow(fixture: WorldCupFixture, now = Date.now()) {
  const kickoff = new Date(fixture.kickoff).getTime();
  return now >= kickoff - LIVE_WINDOW_BEFORE_MS && now <= kickoff + LIVE_WINDOW_AFTER_MS;
}

function normalizeTeamName(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const aliases: Record<string, string> = {
    iran: "iran",
    iriran: "iran",
    korearepublic: "southkorea",
    southkorea: "southkorea",
    unitedstates: "usa",
    unitedstatesofamerica: "usa",
    usa: "usa",
  };

  return aliases[normalized] ?? normalized;
}

function fixturesRepresentSameMatch(a: WorldCupFixture, b: WorldCupFixture) {
  const kickoffDifference = Math.abs(
    new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );

  return kickoffDifference <= PROVIDER_KICKOFF_TOLERANCE_MS
    && normalizeTeamName(a.homeTeam.name) === normalizeTeamName(b.homeTeam.name)
    && normalizeTeamName(a.awayTeam.name) === normalizeTeamName(b.awayTeam.name);
}

function mergePublishedFixtures(
  published: WorldCupFixture[],
  cached: WorldCupFixture[],
) {
  return published.map((fixture) => {
    const previous = cached.find((item) => item.id === fixture.id);
    return previous?.scorers?.length
      ? { ...fixture, scorers: previous.scorers }
      : fixture;
  });
}

function mergeLiveFixtures(
  cached: WorldCupFixture[],
  liveMatches: WorldCupFixture[],
) {
  return cached.map((fixture) => {
    const live = liveMatches.find((match) => fixturesRepresentSameMatch(fixture, match));
    if (!live) return fixture;

    return {
      ...fixture,
      homeScore: live.homeScore,
      awayScore: live.awayScore,
      minute: live.minute,
      extraMinute: live.extraMinute,
      status: live.status,
      statusShort: live.statusShort,
      scorers: live.scorers,
    };
  });
}

function addScheduleContextToLiveMatches(
  liveMatches: WorldCupFixture[],
  scheduledFixtures: WorldCupFixture[],
) {
  return liveMatches.map((match) => {
    const scheduled = scheduledFixtures.find((fixture) =>
      fixturesRepresentSameMatch(fixture, match));

    return {
      ...match,
      tournamentStage: scheduled?.tournamentStage ?? match.tournamentStage,
      group: scheduled?.group ?? match.group,
    };
  });
}

export function Popup() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [fixtures, setFixtures] = useState<WorldCupFixture[]>([]);
  const [configured, setConfigured] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [scheduleState, setScheduleState] = useState<RequestState>("loading");
  const [liveState, setLiveState] = useState<RequestState>("idle");
  const [liveChecked, setLiveChecked] = useState(false);
  const [message, setMessage] = useState("");

  const refreshSchedule = useCallback(async () => {
    setScheduleState("loading");
    setMessage("");

    try {
      const [published, previousCache] = await Promise.all([
        getPublishedWorldCupFixtures(),
        getFixtureCache(),
      ]);
      const refreshedFixtures = mergePublishedFixtures(
        published.fixtures,
        previousCache?.fixtures ?? [],
      );
      const cache = {
        fixtures: refreshedFixtures,
        updatedAt: Date.now(),
        season: published.season,
      };
      await saveFixtureCache(cache);
      setFixtures(refreshedFixtures);
      setHasCache(true);
      setScheduleState("idle");
    } catch (error) {
      setScheduleState("error");
      setMessage(error instanceof Error ? error.message : "Unable to refresh the schedule.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [apiKey, cache, promptSeen] = await Promise.all([
        getApiKey(),
        getFixtureCache(),
        hasSeenApiKeyPrompt(),
      ]);
      const hasApiKey = Boolean(apiKey.trim());
      setConfigured(hasApiKey);

      if (!hasApiKey && !promptSeen) {
        setShowApiKeyPrompt(true);
        void markApiKeyPromptSeen();
      }

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
      const contextualMatches = addScheduleContextToLiveMatches(matches, fixtures);
      const mergedFixtures = mergeLiveFixtures(fixtures, contextualMatches);
      await saveFixtureCache({
        fixtures: mergedFixtures,
        updatedAt: Date.now(),
        season: FIFA_WORLD_CUP_SEASON,
      });
      setFixtures(mergedFixtures);
      setLive(contextualMatches.filter((match) => ACTIVE_STATUSES.has(match.statusShort)));
      setLiveState("idle");
    } catch (error) {
      setLiveState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load live matches.");
    }
  }, [expectedLive.length, fixtures, hasCache]);

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    setMessage("");
    if (nextTab === "live") void loadLive();
  };

  const openSettings = () => void chrome.runtime.openOptionsPage();
  const displayed = tab === "upcoming" ? upcoming : tab === "past" ? past : live;

  return (
    <main className="popup-shell">
      <header className="app-header popup-header">
        <div>
          <span className="eyebrow">Football at a glance</span>
          <h1>GoalWatch</h1>
        </div>
        <button
          className="settings-button"
          type="button"
          onClick={openSettings}
          aria-label={`Open settings. API key ${configured ? "configured" : "missing"}.`}
          title={`Settings · API key ${configured ? "configured" : "missing"}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.4 4.7-1.7-1.3c0-.3-.1-.7-.2-1l1-1.9-2-2-1.9 1c-.3-.1-.6-.2-1-.3L13.2 5h-2.4L9.5 7.7c-.4.1-.7.2-1 .3L6.6 7l-2 2 1 1.9c-.1.3-.2.7-.2 1l-1.8 1.3v2.4l1.8 1.3c0 .4.1.7.2 1l-1 1.9 2 2 1.9-1c.3.1.6.2 1 .3l1.3 2.7h2.4l1.3-2.7c.4-.1.7-.2 1-.3l1.9 1 2-2-1-1.9c.1-.3.2-.6.2-1l1.8-1.3v-2.4Z" />
          </svg>
          <span className={configured ? "settings-status settings-status--configured" : "settings-status settings-status--missing"} />
        </button>
      </header>

      {showApiKeyPrompt && (
        <section className="card setup-prompt" aria-label="API key setup">
          <strong>Set up live scores</strong>
          <p>Add your API-FOOTBALL key to see live scores and goal events.</p>
          <button className="button button--secondary" type="button" onClick={openSettings}>
            Configure API key
          </button>
        </section>
      )}

      <nav className="tab-bar" aria-label="Match views">
        {(["upcoming", "live", "past"] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? "tab tab--active" : "tab"} type="button" onClick={() => selectTab(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

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
          <div className="matches-list">{displayed.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              showKickoff={tab !== "live"}
              showScorers={tab === "live" || (tab === "past" && Boolean(match.scorers?.length))}
            />
          ))}</div>
        )}
      </section>
    </main>
  );
}
