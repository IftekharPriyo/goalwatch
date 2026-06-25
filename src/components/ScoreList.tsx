import type { GoalScorer } from "../types/football";

interface ScoreListProps {
  scorers: GoalScorer[] | null;
}

function formatMinute(minute: number, extraMinute: number | null) {
  return `${minute}${extraMinute ? `+${extraMinute}` : ""}'`;
}

export function ScoreList({ scorers }: ScoreListProps) {
  if (scorers === null) {
    return <p className="scorers-empty">Scorer details are temporarily unavailable.</p>;
  }

  if (scorers.length === 0) {
    return <p className="scorers-empty">No goals recorded yet.</p>;
  }

  return (
    <div className="scorers">
      <h3>Scorers</h3>
      <ul>
        {scorers.map((scorer, index) => (
          <li key={`${scorer.id ?? scorer.name}-${scorer.minute}-${index}`}>
            <span>
              <strong>{scorer.name}</strong>
              <small>{scorer.teamName}{scorer.detail ? ` · ${scorer.detail}` : ""}</small>
            </span>
            <time>{formatMinute(scorer.minute, scorer.extraMinute)}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}

