import type { WorldCupFixture } from "../types/football";

const SCHEDULE_URL =
  "https://iftekharpriyo.github.io/goalwatch/world-cup.json";

interface PublishedSchedule {
  season: number;
  generatedAt: string;
  fixtures: WorldCupFixture[];
}

export async function getPublishedWorldCupFixtures(): Promise<PublishedSchedule> {
  let response: Response;

  try {
    response = await fetch(`${SCHEDULE_URL}?t=${Date.now()}`, { cache: "no-store" });
  } catch {
    throw new Error("Could not download the World Cup schedule.");
  }

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "The shared World Cup schedule has not been published yet."
        : `The schedule service returned an error (${response.status}).`,
    );
  }

  const payload = (await response.json()) as Partial<PublishedSchedule>;
  if (!Array.isArray(payload.fixtures) || typeof payload.season !== "number") {
    throw new Error("The shared World Cup schedule contains invalid data.");
  }

  return payload as PublishedSchedule;
}
