# One Cloudflare Durable Object per Match

The game is server-authoritative and must cost ~$0/month with no cold starts, so we run on Cloudflare Workers with one Durable Object per Match (addressed by its Match Code) holding the Match state and both Players' WebSockets; the same Worker serves the static frontend. A plain Node server on Fly.io/Railway was the portable alternative, but costs money for an always-on machine and loses in-memory state on every deploy, while free sleeping hosts (Render) add ~1 minute cold starts.

## Consequences

- The server is not a Node process: code must run on the Workers runtime, and local dev/tests go through Wrangler/Miniflare.
- Moving off Cloudflare means rewriting the Match host (the shared rules module is unaffected).
