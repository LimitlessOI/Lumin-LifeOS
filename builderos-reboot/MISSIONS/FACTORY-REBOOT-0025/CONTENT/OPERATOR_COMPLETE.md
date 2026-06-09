# Factory Reboot — Complete Operator Guide

## Status check (Adam's one command)

```bash
npm run factory:readiness
```

Full regression:

```bash
npm run factory:ci
```

## What "done" means (honest)

- **Factory platform:** blueprint missions, staging runtime, proofs — **YES** if CI passes
- **Separate GitHub repo:** **YOU** create repo and push `lumin-factory/`
- **Whole LifeOS product:** **NOT** this track

## Push to GitHub (when ready)

```bash
cd lumin-factory
git init
git add .
git commit -m "Initial Lumin Factory cutover"
# Create repo on GitHub, then:
git remote add origin <your-repo-url>
git push -u origin main
```

## Tomorrow's review

Open `builderos-reboot/EVALUATION_PACKET.md` and run `npm run factory:sentry`.
