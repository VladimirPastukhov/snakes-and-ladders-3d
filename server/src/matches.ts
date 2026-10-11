import {
  MATCH_CODE_ALPHABET,
  MATCH_CODE_LENGTH,
  createMatchRequestSchema,
  normaliseMatchCode,
  type RejectReason,
  type ServerMessage,
} from "@sl/shared";

const CREATE_ATTEMPTS = 5;

export function randomMatchCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(MATCH_CODE_LENGTH));
  // 256 % 31 leaves a slight bias toward the first characters; harmless for a game code.
  return [...bytes].map((b) => MATCH_CODE_ALPHABET[b % MATCH_CODE_ALPHABET.length]).join("");
}

function matchStub(env: Env, code: string) {
  return env.MATCH.get(env.MATCH.idFromName(code));
}

/** POST /api/matches: picks a free code and seats the creator. */
export async function createMatch(
  request: Request,
  env: Env,
  nextCode: () => string = randomMatchCode,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const parsed = createMatchRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const { token, name } = parsed.data;
  for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
    const code = nextCode();
    if (await matchStub(env, code).create(code, token, name)) {
      return Response.json({ code }, { status: 201 });
    }
  }
  return Response.json({ error: "no_free_code" }, { status: 503 });
}

/** GET /api/matches/:code/ws: hands the socket to that Match's Durable Object. */
export function connectToMatch(
  request: Request,
  env: Env,
  rawCode: string,
): Promise<Response> | Response {
  if (request.headers.get("Upgrade") !== "websocket") {
    return Response.json({ error: "expected_websocket" }, { status: 426 });
  }
  const code = normaliseMatchCode(rawCode);
  if (!code) return rejectedSocket("not_found");
  return matchStub(env, code).fetch(request);
}

// Browsers can't read the status of a refused upgrade, so refusals arrive as a message.
function rejectedSocket(reason: RejectReason): Response {
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();
  server.send(JSON.stringify({ type: "rejected", reason } satisfies ServerMessage));
  server.close(1000, reason);
  return new Response(null, { status: 101, webSocket: client });
}
