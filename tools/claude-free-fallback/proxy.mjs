// Proxy local : Claude Code -> Anthropic, avec bascule automatique vers FreeLLMAPI
// (modèles gratuits) quand Anthropic répond 429 (limite atteinte).
// Aucune dépendance : Node 18+ suffit.

import http from "node:http";
import { Readable } from "node:stream";

const PORT = Number(process.env.PORT ?? 8787);
const ANTHROPIC_URL = process.env.ANTHROPIC_UPSTREAM ?? "https://api.anthropic.com";
const FREELLM_URL = process.env.FREELLM_URL ?? "http://localhost:3001";
const FREELLM_KEY = process.env.FREELLM_KEY;
const COOLDOWN_MS = Number(process.env.FALLBACK_COOLDOWN_MIN ?? 30) * 60_000;

if (!FREELLM_KEY) {
  console.error("FREELLM_KEY manquant : mets ta clé unifiée FreeLLMAPI dans cette variable.");
  process.exit(1);
}

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "content-length",
  "transfer-encoding",
  "accept-encoding",
]);
const AUTH_HEADERS = new Set(["authorization", "x-api-key"]);

// Tant que cette date n'est pas passée, les requêtes vont directement à FreeLLMAPI.
let freeUntil = 0;

function buildHeaders(incoming, { dropAuth = false, extra = {} } = {}) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming)) {
    if (HOP_BY_HOP.has(name) || value === undefined) continue;
    if (dropAuth && AUTH_HEADERS.has(name)) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return headers;
}

function reply(res, upstream) {
  const headers = {};
  upstream.headers.forEach((value, name) => {
    if (!["content-encoding", "content-length", "transfer-encoding", "connection"].includes(name)) {
      headers[name] = value;
    }
  });
  res.writeHead(upstream.status, headers);
  if (!upstream.body) return res.end();
  Readable.fromWeb(upstream.body).pipe(res);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  try {
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readBody(req);

    if (Date.now() >= freeUntil) {
      const upstream = await fetch(ANTHROPIC_URL + req.url, {
        method: req.method,
        headers: buildHeaders(req.headers),
        body,
        redirect: "manual",
      });
      if (upstream.status !== 429) return reply(res, upstream);

      await upstream.body?.cancel();
      freeUntil = Date.now() + COOLDOWN_MS;
      console.log(`[fallback] Anthropic 429 : bascule vers FreeLLMAPI pendant ${COOLDOWN_MS / 60_000} min`);
    }

    const free = await fetch(FREELLM_URL + req.url, {
      method: req.method,
      headers: buildHeaders(req.headers, {
        dropAuth: true,
        extra: { authorization: `Bearer ${FREELLM_KEY}` },
      }),
      body,
      redirect: "manual",
    });
    reply(res, free);
  } catch (error) {
    console.error(`[erreur] ${req.method} ${req.url} : ${error.message}`);
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ type: "error", error: { type: "proxy_error", message: error.message } }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Proxy Claude -> ${ANTHROPIC_URL} (secours : ${FREELLM_URL}) sur http://127.0.0.1:${PORT}`);
});
