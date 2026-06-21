<!-- SYNOPSIS: Lumin Factory Bundle -->

# Lumin Factory Bundle

This folder is a **portable cutover bundle** built from `Lumin-LifeOS`.

It is not the live repo yet — it is what you copy into a new `Lumin-Factory` GitHub repo when ready.

## Start

```bash
cd factory-staging
npm install
npm run check
npm start
```

## Verify

From bundle root (after copying scripts to a full repo layout):

```bash
node scripts/readiness-report.mjs
```

## Authority

Mission packs live in `missions/`. Do not hand-edit `factory-staging/` without a blueprint step.
