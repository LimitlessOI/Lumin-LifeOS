import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '../..');

async function tryCatch<T>(fn: () => T): Promise<T | null> {
  try {
    return fn();
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}

async function readAuditResults(): Promise<any> {
  return tryCatch(() => JSON.parse(readFileSync(join(ROOT, 'data', 'useful-work-guard-audit-results.json'), 'utf8')));
}

async function readGovernedAutonomyState(): Promise<any> {
  return tryCatch(() => JSON.parse(readFileSync(join(ROOT, 'data', 'governed-autonomy-overnight-state.json'), 'utf8')));
}

const COMPONENT_MATURITY_MAP = {
  builder: ['WIRED', 'LIVE', 'PROVEN'],
  oil: ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  council: ['WIRED', 'LIVE', 'PROVEN'],
  'tsos_internal_hooks': ['WIRED', 'LIVE'],
  memory: ['WIRED', 'LIVE', 'PROVEN'],
  'pb_authority': ['WIRED', 'LIVE', 'PROVEN'],
  'proof_freshness': ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  'self_repair': ['WIRED', 'LIVE', 'PROVEN'],
  'prevention': ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  'telemetry': ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  'overnight_runner': ['WIRED'],
  'command_center': ['WIRED', 'LIVE', 'PROVEN'],
};

const MATURITY_LEVELS = ['NOT_WIRED', 'WIRED', 'LIVE', 'PROVEN', 'ACTIVE'];

function perComp(componentId: string, auditResults: any, governedAutonomyState: any): { current_level: string; next_level: string | null; gap_score: number } {
  const currentLevel = MATURITY_LEVELS[auditResults.status.index];
  const nextLevel = currentLevel === 'ACTIVE' ? null : MATURITY_LEVELS[MATURITY_LEVELS.indexOf(currentLevel) + 1];
  const gapScore = 4 - MATURITY_LEVELS.indexOf(currentLevel);
  return { current_level: currentLevel, next_level: nextLevel, gap_score: gapScore };
}

async function generateGapReport(): Promise<any> {
  const auditResults = await readAuditResults();
  const governedAutonomyState = await readGovernedAutonomyState();
  const components = Object.keys(COMPONENT_MATURITY_MAP).map((componentId) => ({
    component_id: componentId,
    ...perComp(componentId, auditResults, governedAutonomyState),
  }));

  const summary = {
    total_components: components.length,
    active_count: components.filter((component) => component.current_level === 'ACTIVE').length,
    proven_count: components.filter((component) => component.current_level === 'PROVEN').length,
    live_count: components.filter((component) => component.current_level === 'LIVE').length,
    wired_only_count: components.filter((component) => component.current_level === 'WIRED').length,
  };

  const gaps = components.map((component) => ({
    component_id: component.component_id,
    current_maturity: component.current_level,
    next_needed: component.next_level,
    gap_score: component.gap_score,
    known_blocker: component.component_id === 'overnight_runner' ? 'state files missing on Railway FS' :
      component.component_id === 'tsos_internal_hooks' ? 'no PROVEN condition in alpha readiness service' :
        component.component_id === 'builder' ? 'no ACTIVE condition in alpha readiness service' :
          component.component_id === 'council' ? 'no ACTIVE condition in alpha readiness service' :
            'gap not yet analyzed',
  }));

  const result = {
    generated_at: new Date().toISOString(),
    summary,
    gaps,
  };

  writeFileSync(join(ROOT, 'data', 'builderos-gap-report.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  return result;
}

export { generateGapReport };
```

---

```json
{
  "target_file": "scripts/builderos-gap-report.mjs",
  "insert_after_line": null,
  "confidence": 1
}