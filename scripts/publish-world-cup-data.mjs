import { mkdir, writeFile } from "node:fs/promises";

const token = process.env.FOOTBALL_DATA_TOKEN;
if (!token) throw new Error("FOOTBALL_DATA_TOKEN is required.");

const response = await fetch(
  "https://api.football-data.org/v4/competitions/WC/matches",
  { headers: { "X-Auth-Token": token } },
);

if (!response.ok) {
  throw new Error(`football-data.org returned ${response.status}: ${await response.text()}`);
}

const data = await response.json();
const statusMap = {
  SCHEDULED: ["NS", "Scheduled"],
  TIMED: ["NS", "Scheduled"],
  LIVE: ["LIVE", "Live"],
  IN_PLAY: ["LIVE", "In Play"],
  PAUSED: ["HT", "Half Time"],
  FINISHED: ["FT", "Full Time"],
  POSTPONED: ["PST", "Postponed"],
  SUSPENDED: ["SUSP", "Suspended"],
  CANCELLED: ["CANC", "Cancelled"],
};

const fixtures = (data.matches ?? []).map((match) => {
  const [statusShort, status] = statusMap[match.status] ?? [match.status, match.status];
  return {
    id: match.id,
    homeTeam: { id: match.homeTeam?.id ?? 0, name: match.homeTeam?.name ?? "TBD" },
    awayTeam: { id: match.awayTeam?.id ?? 0, name: match.awayTeam?.name ?? "TBD" },
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null,
    minute: null,
    extraMinute: null,
    status,
    statusShort,
    kickoff: match.utcDate,
    scorers: [],
  };
});

const season = Number(data.matches?.[0]?.season?.startDate?.slice(0, 4) ?? 2026);
const output = { season, generatedAt: new Date().toISOString(), fixtures };

await mkdir("site", { recursive: true });
await writeFile("site/world-cup.json", `${JSON.stringify(output, null, 2)}\n`);
await writeFile(
  "site/index.html",
  "<!doctype html><title>GoalWatch Data</title><p>GoalWatch World Cup data feed.</p>\n",
);

console.log(`Published ${fixtures.length} World Cup fixtures.`);
