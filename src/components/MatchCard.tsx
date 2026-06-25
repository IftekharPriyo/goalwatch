import type { LiveMatch } from "../types/football";
import { ScoreList } from "./ScoreList";

interface MatchCardProps {
  match: LiveMatch;
}

function formatMatchStatus(match: LiveMatch) {
  if (match.minute !== null) {
    return `${match.minute}${match.extraMinute ? `+${match.extraMinute}` : ""}'`;
  }

  return match.status;
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <article className="card match-card">
      <div className="match-status">{formatMatchStatus(match)}</div>
      <div className="team-row">
        <span>{match.homeTeam.name}</span>
        <strong>{match.homeScore ?? "–"}</strong>
      </div>
      <div className="team-row">
        <span>{match.awayTeam.name}</span>
        <strong>{match.awayScore ?? "–"}</strong>
      </div>
      <ScoreList scorers={match.scorers} />
    </article>
  );
}

