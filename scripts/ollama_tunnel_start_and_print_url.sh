#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${CLOUDFLARED_PID:-}" ]]; then
    kill "$CLOUDFLARED_PID" 2>/dev/null || true
    wait "$CLOUDFLARED_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ERROR: cloudflared not installed. Install: brew install cloudflare/cloudflare/cloudflared"
  exit 1
fi

if ! curl -sS --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "ERROR: Ollama not reachable at http://localhost:11434. Start Ollama first (e.g. open Ollama app)."
  exit 1
fi

TMP="$(mktemp)"
cloudflared tunnel --url http://localhost:11434 --http-host-header localhost:11434 >"$TMP" 2>&1 &
CLOUDFLARED_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 40); do
  TUNNEL_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TMP" | head -n1 || true)"
  [[ -n "$TUNNEL_URL" ]] && break
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "ERROR: Could not detect trycloudflare URL from cloudflared output."
  echo "---- cloudflared output ----"
  cat "$TMP"
  exit 1
fi

sleep 2

ok=false
for i in 1 2 3 4 5 6; do
  code="$(curl -sS --max-time 10 -o /dev/null -w "%{http_code}" -H "Host: localhost:11434" "${TUNNEL_URL}/api/tags" || echo "000")"
  if [[ "$code" == "200" ]]; then
    ok=true
    break
  fi
  sleep 2
done

if [[ "$ok" != "true" ]]; then
  echo "ERROR: Tunnel did not verify (expected 200)."
  echo "URL: ${TUNNEL_URL}"
  echo "Last HTTP code: ${code}"
  echo "Headers:"
  curl -sS --max-time 10 -i -H "Host: localhost:11434" "${TUNNEL_URL}/api/tags" | head -n 60 || true
  exit 1
fi

echo "OLLAMA_ENDPOINT=${TUNNEL_URL}"
echo "curl -H 'Host: localhost:11434' ${TUNNEL_URL}/api/tags"

wait "$CLOUDFLARED_PID"
