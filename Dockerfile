FROM node:20-slim

WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY scripts/install-git-hooks.mjs scripts/install-git-hooks.mjs
RUN npm ci --omit=dev

COPY . .

RUN test -f factory-staging/factory-core/builder/run-step.js \
  && test -f services/founder-build-quorum-escalation.js \
  && test -f services/obstacle-web-research.js \
  && test -f services/founder-intake-gate.js \
  && node --check routes/lifeos-builderos-command-control-routes.js \
  && node --check services/founder-build-self-repair.js \
  && node --check services/lumin-chair-orchestrator.js \
  && node -e "import('./services/founder-build-self-repair.js')" \
  || (echo "FATAL: spine module missing from Docker image" >&2 && exit 1)

EXPOSE 3000

CMD ["node", "server.js"]
