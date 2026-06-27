export interface Team {
  id: number;
  name: string;
}

export interface GoalScorer {
  id: number | null;
  name: string;
  teamName: string;
  minute: number;
  extraMinute: number | null;
  detail: string | null;
}

export interface LiveMatch {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  extraMinute: number | null;
  status: string;
  scorers: GoalScorer[] | null;
}

export interface WorldCupFixture extends LiveMatch {
  kickoff: string;
  statusShort: string;
}

export interface FixtureCache {
  fixtures: WorldCupFixture[];
  updatedAt: number;
  season: number;
}

