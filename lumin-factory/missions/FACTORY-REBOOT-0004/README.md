# FACTORY-REBOOT-0004

## Mission

Proof mission: materialize `factory-staging/` from frozen payloads and run mechanical acceptance.

## What this proves

- Mission executor can run step-atomic blueprints
- Sha256 acceptance tests enforce byte-exact outputs
- SM-004 council import is byte-identical
- Minimal server stub loads materialized route payloads

## Execute

```bash
npm run factory:materialize
cd factory-staging && npm install && npm run check
```
