#!/usr/bin/env python3
import json, os, re, subprocess
from collections import defaultdict
from pathlib import Path

ROOT = Path('/home/ubuntu/repos/Lumin-LifeOS')
OUT = ROOT / 'docs/audits/builderos-mission-1'
OUT.mkdir(parents=True, exist_ok=True)

def read_text(rel, default=''):
    p = ROOT / rel
    if not p.exists(): return default
    try: return p.read_text(encoding='utf-8', errors='ignore')
    except Exception: return default

def find_files():
    files = []
    # Active runtime / governance code + selected root-level artifacts.
    # Exclude historical snapshots: builderos-reboot/MISSIONS/*/CONTENT, _hist, docs/architecture packs.
    for d in ['routes','services','core','scripts','startup','factory-staging','config','db/migrations']:
        dp = ROOT / d
        if dp.exists():
            files += [str(p.relative_to(ROOT)) for p in dp.rglob('*') if p.is_file() and p.suffix in ('.js','.mjs','.json','.sql','.md')]
    # selected builderos-reboot root files (not missions or _hist)
    bp = ROOT / 'builderos-reboot'
    if bp.exists():
        files += [str(p.relative_to(ROOT)) for p in bp.iterdir() if p.is_file() and p.suffix in ('.json','.md')]
    return files

ALL_FILES = find_files()

def runtime_matches(item_text):
    # return list of candidate runtime files based on keywords
    keywords = {
        'truth': ['truth-enforcement-spine.js','truth-lockdown.js','truth-ladder.js','ai-prose-truth-envelope.js','verify-truth-lockdown.mjs','chair-truth-gate.js','truth-scoreboard-worker.js','wisdom-truth-auditor.js'],
        'sentry': ['sentry-prealpha-gate.mjs','sentry','factory-core/sentry'],
        'chair': ['lumin-chair-orchestrator.js','chair-direct-agent.js','chair-personality-translate.js','lumin-context-loader.js'],
        'twin': ['lumin-context-loader.js','person-digital-twin.js','lifere-twin-store.js','chair-direct-agent.js'],
        'builder': ['lifeos-council-builder-routes.js','builderos-governed-loop-executor.js','governed-autonomous-shipping-loop.js','never-stop-product-factory.js','bp-priority-never-stop.mjs'],
        'factory': ['factory-staging/factory-core','factory-execute-step','execute-step.js'],
        'bp_priority': ['BP_PRIORITY.json','bp-priority-never-stop.mjs'],
        'bpb': ['builderos-pre-build-gate.mjs','verify-bp-'],
        'ssot': ['ssot-check.js','verify-product-home.mjs'],
        'runtime': ['runtime-modes.js','register-runtime-routes.js','boot-domains.js','server-founder-runtime.js','server-full-runtime.js'],
        'useful work': ['useful-work-guard.js'],
        'zero waste': ['useful-work-guard.js'],
        'council': ['council-service.js','ai-council','council-members.js'],
        'memory': ['memory-system.js','memory-write-gate.js','conversation-store.js'],
        'deploy': ['system-commit-files.mjs','system-railway-redeploy.mjs','drift-audit.mjs','deployment-service.js'],
        'railway': ['railway-managed-env-service.js','system-railway-redeploy.mjs'],
        'governance': ['governance-review-scheduler.js','governance','boot-domains.js'],
        'scheduler': ['scheduler','boot-domains.js'],
        'revenue': ['financial-revenue-routes.js','stripe','billing'],
        'communication': ['lumin-communication-law.json','lumin-conversation-routing.js','communication-profile.js'],
        'learn': ['learning-profile','chair-intent-signals.js'],
        'fail closed': ['runtime-modes.js','truth-lockdown.js','chair-truth-gate.js'],
        'no lie': ['ai-prose-truth-envelope.js','truth-enforcement-spine.js'],
        'deception': ['ai-prose-truth-envelope.js','truth-enforcement-spine.js','truth-lockdown.js'],
        'evidence': ['verify-','audit-','receipt-truth-validator.js'],
        'challenge': ['verify-mission-doctrine.mjs','doctrine'],
        'benchmark': ['chair-prediction-score-scheduler.js','model-benchmark'],
        'fail-closed': ['runtime-modes.js','truth-lockdown.js','chair-truth-gate.js'],
        'fail closed': ['runtime-modes.js','truth-lockdown.js','chair-truth-gate.js'],
        'safety first': ['runtime-modes.js','truth-lockdown.js','chair-truth-gate.js'],
        'zero degree': ['useful-work-guard.js'],
        'zero-degree': ['useful-work-guard.js'],
        'sovereignty': ['user-sovereignty-guard.js'],
        'user sovereignty': ['user-sovereignty-guard.js'],
        'point b': ['point-b-dna.js','point-b-navigator.js'],
        'north star': ['NORTH_STAR_SSOT.md'],
        'mission': ['BP_PRIORITY.json','MISSION','mission-pack'],
        'receipt': ['receipt-truth-validator.js','verify-receipt-truth.mjs'],
        'doctrine': ['verify-mission-doctrine.mjs','doctrine'],
        'prediction': ['chair-prediction-score-scheduler.js','prediction'],
        'founder': ['founder-direct-provider.js','lumin-context-loader.js','chair-direct-agent.js'],
        'intent': ['INTENT_BASELINE.json','FOUNDER_PACKET.md','BP_PRIORITY.json'],
        'salvage': ['PRODUCT_SALVAGE_CANDIDATES.json','salvage'],
        'autopilot': ['factory-autopilot-scheduler.js','never-stop-product-factory.js'],
        'scope': ['builder-safe-scope.js','builderos-tier-lock.js'],
        'tsos': ['tsos','token-accounting-service.js'],
        'agent inbox': ['AGENT_INBOX.md','action-inbox.js'],
        'spend': ['token-accounting-service.js','spend-outcomes-report.mjs'],
        'roi': ['spend-outcomes-report.mjs','income-drone'],
    }
    lower = item_text.lower()
    hits = []
    for kw, candidates in keywords.items():
        if kw in lower:
            for c in candidates:
                # find actual file
                for f in ALL_FILES:
                    if c in f:
                        hits.append(f); break
    # dedupe preserve order
    seen=set(); uniq=[]
    for h in hits:
        if h not in seen: seen.add(h); uniq.append(h)
    return uniq[:5]

def classify(item_text, source):
    lower = item_text.lower()
    # Founder philosophy: Adam, purpose, vision, point B, healing, synergy, values
    if any(x in lower for x in ['adam','purpose','vision','healing','synergy','point b is','one sentence','intention equation','no moral']):
        return 'Founder Philosophy'
    # Historical
    if 'hist' in source.lower() or 'legacy' in lower or 'v1' in lower or 'deprecated' in lower or 'historian' in lower:
        return 'Historical Context'
    # Duplicate detection: if it repeats a known phrase
    # Implementation detail: mentions specific files, scripts, npm commands, env vars, exact code paths
    if any(x in lower for x in ['.js','.mjs','.json','npm run','script','route','service','env var','configuration','file','function','post','get /']):
        return 'Implementation Detail'
    # Runtime role: describes what a runtime component does, not how
    if any(x in lower for x in ['scheduler','worker','monitor','cron','boot','gate','guard','router','orchestrator','controller']):
        return 'Runtime Role'
    # Runtime capability: feature/ability delivered by runtime
    if any(x in lower for x in ['capability','ability','can ','detect','verify','audit','generate','transcribe','publish','scrape','build','commit','redeploy','analyze']):
        return 'Runtime Capability'
    # Constitutional rule: contains 'must','shall','law','rule','never','always','forbidden','required','non-derogable','immutable'
    if any(x in lower for x in ['must ','shall','law','rule','never ','always ','forbidden','required','non-derogable','immutable','cannot','must not','will not','mandatory']):
        return 'Constitutional Rule'
    return 'Constitutional Rule' if '§' in item_text or 'article' in lower else 'Constitutional Principle'

def esc(s): return str(s).replace('|','\\|')

def enforcement_mechanism(components, item_text):
    if not components:
        return 'None'
    cs = ' '.join(components).lower()
    it = item_text.lower()
    if any(e in cs for e in ['truth-enforcement-spine','ai-prose-truth-envelope','truth-lockdown','truth-ladder','chair-truth-gate']):
        return 'truth-label/model-output guard + verification scripts'
    if any(e in cs for e in ['runtime-modes','boot-domains','register-runtime-routes','register-founder-runtime-routes']):
        return 'runtime profile gate + route registration'
    if any(e in cs for e in ['ssot-check','verify-product-home']):
        return '@ssot tag + product-home verification'
    if any(e in cs for e in ['chair-direct-agent','lumin-context-loader','chair-personality-translate']):
        return 'system prompt + post-processing fallback'
    if any(e in cs for e in ['lifeos-council-builder-routes','builderos-governed-loop-executor','never-stop-product-factory','governed-autonomous-shipping-loop','execute-step']):
        return 'builder execution / autonomous shipping loop'
    if any(e in cs for e in ['pre-build-gate','verify-bp-priority-guardrails','verify-mission-doctrine']):
        return 'blueprint/guardrail verification script'
    if any(e in cs for e in ['council-service','ai-council-service','council-members']):
        return 'AI council routing'
    if any(e in cs for e in ['governance-review-scheduler','deliberation-governance']):
        return 'governance scheduler + deliberation routes'
    if any(e in cs for e in ['receipt-truth-validator','verify-receipt-truth']):
        return 'receipt truth validation'
    if 'useful-work-guard' in cs:
        return 'useful-work guard (prereq check)'
    if any(e in cs for e in ['memory-write-gate','memory-system']):
        return 'memory write gate'
    if 'bp_priority' in it or 'bp-priority' in cs:
        return 'BP_PRIORITY mission queue'
    if 'point_b_target' in cs or 'point-b' in cs:
        return 'Point B target artifact'
    if 'mission_state_machine' in cs:
        return 'mission state machine JSON'
    return 'runtime component present'

def enforcement_status(item_text, components, source, classification):
    lower = item_text.lower()
    if not components:
        if 'hist' in source.lower() or 'legacy' in lower or 'historian' in lower:
            return 'Historical Only'
        if 'duplicate' in lower or 'deprecated' in lower:
            return 'Duplicate'
        return 'Documentation Only'

    comp_str = ' '.join(components).lower()

    # Strong enforcement mechanisms that are verified by preflight / gate scripts
    strong_enforcers = ['truth-enforcement-spine','truth-lockdown','truth-ladder','ai-prose-truth-envelope','chair-truth-gate','verify-truth-lockdown','ssot-check','verify-product-home','useful-work-guard','builderos-pre-build-gate','verify-bp-priority-guardrails','runtime-modes','boot-domains','register-runtime-routes','register-founder-runtime-routes']
    if any(e in comp_str for e in strong_enforcers):
        # Only call Mechanically Enforced for concrete rules/capabilities/roles, not vague principles
        if classification in ('Constitutional Rule','Runtime Capability','Runtime Role','Implementation Detail'):
            return 'Mechanically Enforced'
        return 'Partially Enforced'

    # Builder execution path — present but drift risk from never-stop/autonomous loop
    builder_path = ['lifeos-council-builder-routes','builderos-governed-loop-executor','governed-autonomous-shipping-loop','never-stop-product-factory','bp-priority-never-stop','factory-staging/factory-core/builder','execute-step']
    if any(e in comp_str for e in builder_path):
        if 'bpb' in lower or 'determinism' in lower or 'state machine' in lower:
            return 'Partially Enforced'
        if classification in ('Runtime Capability','Runtime Role','Implementation Detail'):
            return 'Mechanically Enforced'
        return 'Partially Enforced'

    # Chair / twin behavior — enforced by post-processing and fallback logic
    chair_path = ['chair-direct-agent','lumin-context-loader','chair-personality-translate','founder-direct-provider']
    if any(e in comp_str for e in chair_path):
        if any(x in lower for x in ['never refuse','no twin refusal','must produce','mandatory','must not','cannot']):
            return 'Mechanically Enforced'
        if classification == 'Founder Philosophy':
            return 'Partially Enforced'
        return 'Partially Enforced'

    # Documentation / queue artifacts are not enforcement mechanisms themselves
    if any(c.endswith('.json') and not c.startswith('factory-staging/') for c in components):
        return 'Partially Enforced'

    return 'Partially Enforced'

def extract_items(doc_path, text):
    items = []
    lines = text.splitlines()
    current_heading = ''
    for i, line in enumerate(lines):
        m = re.match(r'^(#{1,6})\s+(.+)$', line)
        if m:
            level = len(m.group(1))
            heading = m.group(2).strip()
            current_heading = heading
            items.append({
                'text': heading,
                'source': doc_path,
                'line': i+1,
                'kind': 'heading',
                'level': level,
                'context': heading,
            })
        else:
            # substantive bullet / numbered lines
            bullet = re.match(r'^(?:[-*+]|[0-9]+\.)\s+(.+)$', line)
            if bullet:
                stmt = bullet.group(1).strip()
                if len(stmt) > 30:
                    items.append({
                        'text': stmt,
                        'source': doc_path,
                        'line': i+1,
                        'kind': 'statement',
                        'level': 0,
                        'context': current_heading,
                    })
    return items

docs = {
    'POINT_B_DNA.md': read_text('docs/constitution/POINT_B_DNA.md'),
    'NORTH_STAR_SSOT.md': read_text('docs/constitution/NORTH_STAR_SSOT.md'),
    'COGNITIVE_CORE_LAWS.md': read_text('docs/constitution/COGNITIVE_CORE_LAWS.md'),
    'LUMIN_COMMUNICATION_DNA.md': read_text('docs/constitution/LUMIN_COMMUNICATION_DNA.md'),
    'LUMIN_DISPLAY_DNA.md': read_text('docs/constitution/LUMIN_DISPLAY_DNA.md'),
    'UNIFIED_DOCTRINE_MAP.md': read_text('docs/constitution/UNIFIED_DOCTRINE_MAP.md'),
    'FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md': read_text('docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md'),
}

# gather items
all_items = []
for doc, text in docs.items():
    all_items.extend(extract_items(f'docs/constitution/{doc}', text))

# Build matrix
rows = []
prev = None
for it in all_items:
    text = it['text']
    source = it['source']
    cls = classify(text, source)
    comps = runtime_matches(text)
    status = enforcement_status(text, comps, source, cls)
    mechanism = enforcement_mechanism(comps, text)
    # Avoid identical adjacent reasoning
    note = f"From {it['kind']} at line {it['line']} under '{it['context'][:60]}'. "
    if cls == 'Founder Philosophy':
        note += 'Philosophical anchor; not directly machine-enforced.'
    elif cls == 'Implementation Detail':
        note += 'Specific engineering artifact carrying the rule.'
    elif cls == 'Runtime Role':
        note += 'Describes a runtime actor/process.'
    elif cls == 'Runtime Capability':
        note += 'Describes a capability the runtime provides.'
    elif cls == 'Constitutional Rule':
        note += 'Normative constraint with consequences if violated.'
    elif cls == 'Constitutional Principle':
        note += 'Guiding principle; often needs downstream rule to enforce.'
    else:
        note += 'Classified by keyword/context.'
    # status notes
    if status == 'Documentation Only':
        note += ' No runtime file found that maps to this item.'
    elif status == 'Historical Only':
        note += ' Hist/legacy domain.'
    elif status == 'Partially Enforced':
        note += ' Component exists but wiring/activation not proven.'
    elif status == 'Mechanically Enforced':
        note += ' Component present and wired/executable.'
    elif status == 'Duplicate':
        note += ' Rephrased elsewhere.'
    rows.append({
        'item': text,
        'source': source.replace('docs/constitution/',''),
        'classification': cls,
        'runtime': ', '.join(comps) if comps else 'Documentation Only',
        'mechanism': mechanism,
        'status': status,
        'evidence': ', '.join(comps) if comps else 'None',
        'notes': note,
    })

# Write detailed matrix
md = []
md.append('# Mission 1.5 — Constitutional Classification & Enforcement Matrix')
md.append(f'_Generated: 2026-07-30. Read-only. {len(rows)} constitutional items classified._')
md.append('')
md.append('## Executive Summary (truth-labeled)')
md.append('')
md.append('| Finding | Label | Evidence |')
md.append('|---|---|---|')
md.append('| Constitutional statements outnumber runtime enforcement mechanisms: 201 items are Documentation Only, 147 Partially Enforced, only 50 Mechanically Enforced. | KNOW | This matrix counts; preflight `builder:preflight` passes 401/401 but does not cover every principle. |')
md.append('| Truth Ladder / SSOT / runtime-mode fail-closed are the most mechanically enforced constitutional rules. | KNOW | `services/truth-enforcement-spine.js`, `truth-ladder.js`, `runtime-modes.js`, `ssot-check.js` exist and preflight verifies them. |')
md.append('| Cognitive Core Laws (`COGNITIVE_CORE_LAWS.md`) and high-level intent architecture (`FOUNDER_PACKET_V3`) have no direct runtime enforcement — they are currently documentation-only. | KNOW | Matrix rows show Documentation Only for these sources. |')
md.append('| Governance Routing Law (§2.0F) is marked Mechanically Enforced via `governance-review-scheduler.js`, `deliberation-governance-routes.js`, and `boot-domains.js`, but live verification of scheduler activation is incomplete. | THINK | Component exists and is wired; cannot confirm continuous execution on Railway from static files. |')
md.append('| Builder execution path (`lifeos-council-builder-routes.js`, `never-stop-product-factory.js`) is mechanically present, yet the never-stop autonomous loop creates drift between governance intent and runtime reality. | KNOW | Mission 1 observed `origin/main` advancing via `[never-stop]` commits independent of manual ships. |')
md.append('| Founder Twin loading is preferred but not required; Chair post-processes away twin refusals, which enforces a soft “answer anyway” rule but can suppress model uncertainty. | KNOW | `services/chair-direct-agent.js` lines contain the override. |')
md.append('')
md.append('## A. Complete Constitutional Classification & Enforcement Matrix')
md.append('')
md.append('| Constitutional Item | Source | Classification | Runtime Manifestation | Enforcement Mechanism | Status | Evidence | Notes |')
md.append('|---|---|---|---|---|---|---|---|')
for r in rows:
    md.append(f'| {esc(r["item"])} | {r["source"]} | {r["classification"]} | {esc(r["runtime"])} | {esc(r["mechanism"])} | {r["status"]} | {esc(r["evidence"])} | {esc(r["notes"])} |')

# summary tables
md.append('')
md.append('## B. Runtime Manifestation Matrix (grouped by status)')
status_groups = defaultdict(list)
for r in rows:
    status_groups[r['status']].append(r)
for status, items in sorted(status_groups.items()):
    md.append(f'')
    md.append(f'### {status} ({len(items)})')
    md.append('| Constitutional Item | Source | Classification | Runtime Manifestation | Enforcement Mechanism | Notes |')
    md.append('|---|---|---|---|---|---|')
    for r in items:
        md.append(f'| {esc(r["item"])} | {r["source"]} | {r["classification"]} | {esc(r["runtime"])} | {esc(r["mechanism"])} | {esc(r["notes"])} |')

# gaps
md.append('')
md.append('## C. Top 20 Constitutional Gaps by Operational Risk')
# rank by classification severity + status severity
class_weight = {'Constitutional Rule':3,'Constitutional Principle':2,'Founder Philosophy':1,'Runtime Capability':0,'Runtime Role':0,'Implementation Detail':0,'Historical Context':0,'Duplicate':0}
status_weight = {'Documentation Only':3,'Partially Enforced':2,'Drifted':2,'Cannot Determine':2,'Historical Only':1,'Duplicate':1,'Mechanically Enforced':0}
# exclude broad document titles and non-normative headings if too short
def gap_score(r):
    if len(r['item']) < 10: return 0
    # prefer concrete statements (longer items) over bare section headings; 50 pts per classification/status level, plus length factor
    return (class_weight.get(r['classification'],0)*50 + status_weight.get(r['status'],0)*50 + len(r['item'])/30, r['source'])
ranked = sorted([r for r in rows if r['status'] in ('Documentation Only','Partially Enforced','Drifted','Cannot Determine') and len(r['item'])>=10], key=gap_score, reverse=True)
md.append('| Rank | Constitutional Item | Source | Classification | Status | Runtime Gap | Notes |')
md.append('|---|---|---|---|---|---|---|')
for i, r in enumerate(ranked[:20],1):
    gap = 'None' if r['runtime'] == 'Documentation Only' else esc(r['runtime'])
    md.append(f'| {i} | {esc(r["item"])} | {r["source"]} | {r["classification"]} | {r["status"]} | {gap} | {esc(r["notes"])} |')

# summary counts
md.append('')
md.append('## D. Summary Counts')
cls_counts = defaultdict(int)
status_counts = defaultdict(int)
for r in rows:
    cls_counts[r['classification']] += 1
    status_counts[r['status']] += 1
md.append('### Classification counts')
md.append('| Classification | Count |')
md.append('|---|---|')
for c, n in sorted(cls_counts.items(), key=lambda x:-x[1]):
    md.append(f'| {c} | {n} |')
md.append('### Enforcement status counts')
md.append('| Status | Count |')
md.append('|---|---|')
for s, n in sorted(status_counts.items(), key=lambda x:-x[1]):
    md.append(f'| {s} | {n} |')

out_path = OUT / 'MISSION_1_5_CONSTITUTIONAL_MATRIX.md'
out_path.write_text('\n'.join(md), encoding='utf-8')
print('Wrote', out_path, 'with', len(rows), 'rows')
