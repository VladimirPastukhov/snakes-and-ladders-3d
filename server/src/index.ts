import { connectToMatch, createMatch } from "./matches";

export { Match } from "./match";

const MATCH_SOCKET_PATH = /^\/api\/matches\/([^/]+)\/ws$/;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

// A path whose last segment has an extension (e.g. /assets/app.js) names a file.
function looksLikeFile(pathname: string): boolean {
  return /\.[^/]+$/.test(pathname);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      if (request.method === "GET" && pathname === "/api/health") {
        return json({ status: "ok", version: env.VERSION });
      }
      if (request.method === "POST" && pathname === "/api/matches") {
        return createMatch(request, env);
      }
      const socketPath = MATCH_SOCKET_PATH.exec(pathname);
      if (request.method === "GET" && socketPath) {
        return connectToMatch(request, env, socketPath[1]!);
      }
      return json({ error: "not_found" }, 404);
    }

    // Deep links such as /m/K7QXM load the game page; missing files stay 404.
    if (request.method === "GET" && !looksLikeFile(pathname)) {
      return env.ASSETS.fetch(new URL("/", url));
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
