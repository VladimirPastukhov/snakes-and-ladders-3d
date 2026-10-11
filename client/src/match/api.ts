import { createMatchResponseSchema, type CreateMatchRequest } from "@sl/shared";

/** POST /api/matches; resolves with the new Match Code. */
export async function createMatch(request: CreateMatchRequest): Promise<string> {
  const response = await fetch("/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (response.status !== 201) throw new Error(`Create failed: ${response.status}`);
  return createMatchResponseSchema.parse(await response.json()).code;
}
