import type { WorldCupFixture } from "../types/football";
import { ScoreList } from "./ScoreList";

interface MatchCardProps {
  match: WorldCupFixture;
  showKickoff?: boolean;
  showScorers?: boolean;
}

function formatMatchStatus(match: WorldCupFixture, showKickoff: boolean) {
  if (match.minute !== null) {
    return `${match.minute}${match.extraMinute ? `+${match.extraMinute}` : ""}'`;
  }

  if (showKickoff) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(match.kickoff));
  }

  return match.status;
}

export function MatchCard({
  match,
  showKickoff = false,
  showScorers = false,
}: MatchCardProps) {
  return (
    <article className="card match-card">
      <div className="match-status">{formatMatchStatus(match, showKickoff)}</div>
      {(match.tournamentStage || match.group) && (
        <div className="match-context">
          {[match.tournamentStage, match.group].filter(Boolean).join(" · ")}
        </div>
      )}
      <div className="team-row">
        <span>{match.homeTeam.name}</span>
        <strong>{match.homeScore ?? "–"}</strong>
      </div>
      <div className="team-row">
        <span>{match.awayTeam.name}</span>
        <strong>{match.awayScore ?? "–"}</strong>
      </div>
      {showScorers && <ScoreList scorers={match.scorers} />}
    </article>
  );
}

