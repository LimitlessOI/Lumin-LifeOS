FROM node:20-slim

WORKDIR /usr/src/app

# The browser agent (services/browser-agent.js, Puppeteer) needs a real Chrome in
# the container. We install the system Chromium and point Puppeteer at it instead
# of downloading Puppeteer's bundled Chromium — smaller, and matches the Debian libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ffmpeg \
      ca-certificates \
      dbus \
      fonts-liberation \
      fonts-noto-color-emoji \
      fonts-unifont \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libatspi2.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libglib2.0-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
      libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Use Puppeteer's OWN matched Chrome build, not the distro chromium. The Debian
# `chromium` package is a v150 wrapper while puppeteer 24.x expects its matched
# build; that mismatch crashed on launch (starts, then dies with Code: null and
# no fatal message). We still install the apt `chromium` above only for its
# shared-library closure. Puppeteer downloads its Chrome into PUPPETEER_CACHE_DIR
# at build time and resolves it automatically at runtime (no executablePath).
ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY scripts/install-git-hooks.mjs scripts/install-git-hooks.mjs
RUN npm ci --omit=dev
RUN npx puppeteer browsers install chrome

COPY . .

RUN test -f factory-staging/factory-core/builder/run-step.js \
  && test -f services/founder-build-quorum-escalation.js \
  && test -f services/obstacle-web-research.js \
  && test -f services/founder-intake-gate.js \
  && node --check routes/lifeos-builderos-command-control-routes.js \
  && node --check services/founder-build-self-repair.js \
  && node --check services/lumin-chair-orchestrator.js \
  && node scripts/verify-spine-imports.mjs \
  && node -e "import('./services/founder-build-self-repair.js')" \
  || (echo "FATAL: spine module missing from Docker image" >&2 && exit 1)

EXPOSE 8080

# /healthz is mounted before DB/boot-dependent routes specifically so it stays
# truthful even if a later route surface regresses (server-founder-runtime.js) —
# the right liveness target: a wedged/dead process fails this, a
# still-initializing one does not. Previously no HEALTHCHECK existed at all, so
# Railway had no way to detect "process alive but unresponsive" (2026-07-19 audit).
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run node through a shell with `exec` so it does not become a bare PID 1.
# Node as PID 1 does not ignore SIGPIPE the way it does otherwise; when the
# production pino logger writes JSON to the stdout pipe (Railway/Docker log
# collector), the process exits 0 before binding, so the container never
# serves and the edge sees a dial timeout. Launching via `sh -c "exec ..."`
# makes node inherit SIGPIPE=ignore while still receiving SIGTERM directly.
CMD ["sh", "-c", "exec node server.js"]
