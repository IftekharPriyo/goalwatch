import { getApiKey } from "./storage";
import type { GoalScorer, WorldCupFixture } from "../types/football";

const API_BASE_URL = "https://v3.football.api-sports.io";
const FIFA_WORLD_CUP_LEAGUE_ID = 1;
const ACTIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"]);

interface ApiResponse<T> {
  errors?: Record<string, string> | string[];
  response: T[];
}

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
      extra: number | null;
    };
  };
  league: {
    id: number;
    round: string | null;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiEvent {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    name: string;
  };
  player: {
    id: number | null;
    name: string | null;
  };
  type: string;
  detail: string;
}

export type FootballApiErrorCode =
  | "missing-key"
  | "invalid-key"
  | "rate-limit"
  | "network"
  | "api";

export class FootballApiError extends Error {
  constructor(
    message: string,
    public readonly code: FootballApiErrorCode,
  ) {
    super(message);
    this.name = "FootballApiError";
  }
}

function getApiError(errors: ApiResponse<unknown>["errors"]): string | null {
  if (Array.isArray(errors)) {
    return errors.length > 0 ? errors.join(" ") : null;
  }

  if (errors && Object.keys(errors).length > 0) {
    return Object.values(errors).join(" ");
  }

  return null;
}

async function request<T>(path: string, apiKey: string): Promise<T[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        "x-apisports-key": apiKey,
      },
    });
  } catch {
    throw new FootballApiError(
      "Could not connect to the football service. Check your connection and try again.",
      "network",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new FootballApiError("The saved API key was rejected.", "invalid-key");
  }

  if (response.status === 429) {
    throw new FootballApiError("The API request limit has been reached.", "rate-limit");
  }

  if (!response.ok) {
    throw new FootballApiError(
      `The football service returned an error (${response.status}).`,
      "api",
    );
  }

  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new FootballApiError("The football service returned invalid data.", "api");
  }

  const apiError = getApiError(payload.errors);

  if (apiError) {
    const normalizedError = apiError.toLowerCase();
    const code = normalizedError.includes("limit")
      ? "rate-limit"
      : normalizedError.includes("key") || normalizedError.includes("token")
        ? "invalid-key"
        : "api";

    throw new FootballApiError(apiError, code);
  }

  if (!Array.isArray(payload.response)) {
    throw new FootballApiError("The football service returned invalid data.", "api");
  }

  return payload.response;
}

function mapGoalEvents(events: ApiEvent[]): GoalScorer[] {
  return events
    .filter((event) => event.type === "Goal" && event.detail !== "Missed Penalty")
    .map((event) => ({
      id: event.player.id,
      name: event.player.name ?? "Unknown scorer",
      teamName: event.team.name,
      minute: event.time.elapsed,
      extraMinute: event.time.extra,
      detail:
        event.detail === "Penalty" || event.detail === "Own Goal" ? event.detail : null,
    }));
}

async function getFixtureScorers(fixtureId: number, apiKey: string) {
  const events = await request<ApiEvent>(`/fixtures/events?fixture=${fixtureId}`, apiKey);
  return mapGoalEvents(events);
}

function mapFixture(fixture: ApiFixture, scorers: GoalScorer[] | null): WorldCupFixture {
  const isClockRunning = ["1H", "2H", "ET"].includes(fixture.fixture.status.short);

  return {
    id: fixture.fixture.id,
    homeTeam: fixture.teams.home,
    awayTeam: fixture.teams.away,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    minute: isClockRunning ? fixture.fixture.status.elapsed : null,
    extraMinute: isClockRunning ? fixture.fixture.status.extra : null,
    status: fixture.fixture.status.long || fixture.fixture.status.short,
    statusShort: fixture.fixture.status.short,
    kickoff: fixture.fixture.date,
    tournamentStage: fixture.league.round,
    group: null,
    scorers,
  };
}

async function getApiKeyOrThrow(): Promise<string> {
  const apiKey = (await getApiKey()).trim();

  if (!apiKey) {
    throw new FootballApiError("Add an API key in settings to load matches.", "missing-key");
  }

  return apiKey;
}

export async function getLiveMatches(): Promise<WorldCupFixture[]> {
  const apiKey = await getApiKeyOrThrow();
  const fixtures = await request<ApiFixture>("/fixtures?live=all", apiKey);
  const worldCupFixtures = fixtures.filter(
    (fixture) => fixture.league.id === FIFA_WORLD_CUP_LEAGUE_ID,
  );

  return Promise.all(
    worldCupFixtures.map(async (fixture) => {
      const totalGoals = (fixture.goals.home ?? 0) + (fixture.goals.away ?? 0);

      if (totalGoals === 0 || !ACTIVE_STATUSES.has(fixture.fixture.status.short)) {
        return mapFixture(fixture, []);
      }

      try {
        const scorers = await getFixtureScorers(fixture.fixture.id, apiKey);
        return mapFixture(fixture, scorers);
      } catch {
        // A failed events request should not hide a valid live score.
        return mapFixture(fixture, null);
      }
    }),
  );
}
