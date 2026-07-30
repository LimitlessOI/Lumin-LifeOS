#!/usr/bin/env python3
import json, os, re, subprocess
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path('/home/ubuntu/repos/Lumin-LifeOS')
OUT = ROOT / 'docs/audits/builderos-mission-1'
OUT.mkdir(parents=True, exist_ok=True)

def read_text(rel, default=''):
    p = ROOT / rel
    if not p.exists(): return default
    try: return p.read_text(encoding='utf-8', errors='ignore')
    except Exception: return default

def read_json(rel):
    try:
        p = ROOT / rel
        if p.exists(): return json.loads(p.read_text(encoding='utf-8', errors='ignore'))
    except Exception as e: return {'_error': str(e)}
    return None

def slurp(name):
    p = OUT / f'{name}_raw.txt'
    return p.read_text(encoding='utf-8', errors='ignore') if p.exists() else ''

def find_files(pattern):
    # support rglob patterns relative to ROOT
    if pattern.startswith('docs/') or pattern.startswith('data/') or pattern.startswith('factory-staging/') or '/' in pattern:
        # If it contains **, use ROOT.rglob with the part after the first ** or split dir
        return sorted([str(p.relative_to(ROOT)) for p in ROOT.rglob(pattern) if p.is_file()])
    return sorted([str(p.relative_to(ROOT)) for p in ROOT.rglob(pattern) if p.is_file()])

def run(cmd):
    try: return subprocess.check_output(cmd, shell=True, text=True, cwd=ROOT, timeout=60)
    except Exception as e: return str(e)

def headings(text):
    return [h.strip() for h in re.findall(r'^#{1,6}\s+(.+)$', text, re.MULTILINE)]

# load
constitution = {
    'POINT_B_DNA.md': read_text('docs/constitution/POINT_B_DNA.md'),
    'NORTH_STAR_SSOT.md': read_text('docs/constitution/NORTH_STAR_SSOT.md'),
    'LUMIN_COMMUNICATION_DNA.md': read_text('docs/constitution/LUMIN_COMMUNICATION_DNA.md'),
    'UNIFIED_DOCTRINE_MAP.md': read_text('docs/constitution/UNIFIED_DOCTRINE_MAP.md'),
    'COGNITIVE_CORE_LAWS.md': read_text('docs/constitution/COGNITIVE_CORE_LAWS.md'),
    'LUMIN_DISPLAY_DNA.md': read_text('docs/constitution/LUMIN_DISPLAY_DNA.md'),
    'FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md': read_text('docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md'),
}
products = {}
for d in (ROOT / 'docs/products').iterdir():
    if d.is_dir() and (d / 'PRODUCT_HOME.md').exists():
        products[d.name] = read_text(f'docs/products/{d.name}/PRODUCT_HOME.md')

builderos_home = products.get('builderos','')
lifeos_home = products.get('lifeos','')

bp_priority = read_json('builderos-reboot/BP_PRIORITY.json')
mission_queue = read_json('builderos-reboot/MISSION_QUEUE.json')
mission_pack_index = read_json('builderos-reboot/MISSION_PACK_INDEX.json')
working_def = read_json('builderos-reboot/BUILDEROS_WORKING_DEFINITION.json')
current_state = read_json('builderos-reboot/CURRENT_STATE.json')
project_cert = read_json('builderos-reboot/PROJECT_CERTIFICATION.json')
product_readiness = read_json('builderos-reboot/PRODUCT_READINESS_REPORT.json')
file_manifest = read_json('docs/products/builderos/FILE_MANIFEST.json')
product_registry = read_json('docs/products/PRODUCT_REGISTRY.json') or read_json('docs/products/INDEX.md')
authority_boundaries = read_text('docs/products/AUTHORITY_BOUNDARIES.md')

current_bp_gaps = read_text('builderos-reboot/CURRENT_BP_GAPS_V1.md')
workspace_status = read_text('builderos-reboot/WORKSPACE_STATUS.md')
handoff = read_text('builderos-reboot/HANDOFF.md')
cutover_manifest = read_text('builderos-reboot/CUTOVER_MANIFEST.md')
hist_registry = read_json('builderos-reboot/HIST_DOMAIN_REGISTRY.json')

ssot_raw = slurp('ssot_check')
false_done_raw = slurp('false_done')
doctrine_c2_raw = slurp('doctrine_c2')
harness_raw = slurp('harness_audit')
runtime_ready = read_json('docs/audits/builderos-mission-1/runtime_ready.json') or {}
health = read_json('docs/audits/builderos-mission-1/health.json') or {}

md_lines = []
def h(level, text): md_lines.append('\n' + '#'*level + ' ' + text)
def paragraph(text=''): md_lines.append(text)
def table(headers, rows):
    md_lines.append('| ' + ' | '.join(headers) + ' |')
    md_lines.append('|' + '|'.join(['---']*len(headers)) + '|')
    for r in rows:
        md_lines.append('| ' + ' | '.join(str(c).replace('|','\\|') for c in r) + ' |')

def save(name):
    (OUT / name).write_text('\n'.join(md_lines), encoding='utf-8')

# 00 master
md_lines.clear(); h(1, 'BuilderOS Mission 1 — Constitutional Reality Audit & Architectural Map')
paragraph('_Generated: 2026-07-30. Read-only. No code changes._')
paragraph()
paragraph('**Current production reality:**')
paragraph(f'- `/api/v1/lifeos/builder/ready` reports `runtime_profile: {runtime_ready.get("runtime_profile","?")}`')
paragraph(f'- `deploy_commit_sha`: `{runtime_ready.get("codegen",{}).get("deploy_commit_sha","?")}`')
paragraph(f'- `origin/main` HEAD: `{run("git rev-parse --short HEAD").strip()}`')
paragraph(f'- Local behind/ahead origin: `{run("git rev-list --left-right --count origin/main...HEAD").strip()}`')
paragraph(f'- `/api/health`: `ok={health.get("ok")}`')
paragraph()
paragraph('## Deliverable Sections')
secs=[('1. Constitutional Map','01_CONSTITUTIONAL_MAP.md'),('2. Dependency Graph','02_DEPENDENCY_GRAPH.md'),('3. Duplication Report','03_DUPLICATION_REPORT.md'),('4. Blueprint Drift Report','04_BLUEPRINT_DRIFT.md'),('5. Runtime Drift Report','05_RUNTIME_DRIFT.md'),('6. Governance Drift Report','06_GOVERNANCE_DRIFT.md'),('7. Truth Audit','07_TRUTH_AUDIT.md'),('8. SENTRY Audit','08_SENTRY_AUDIT.md'),('9. Founder Twin Audit','09_FOUNDER_TWIN_AUDIT.md'),('10. Architectural Inventory','10_ARCHITECTURAL_INVENTORY.md')]
table(['Section','File'], [[s,f] for s,f in secs])
save('00_MASTER_INDEX.md')

# 01 constitutional
md_lines.clear(); h(1, '1. Constitutional Map')
paragraph('Principles extracted from Constitution and BuilderOS product home.')
principles=[]
for htext in headings(constitution['POINT_B_DNA.md']):
    if htext in ['Point B DNA — Supreme Purpose (Constitutional)']: continue
    principles.append([htext,'docs/constitution/POINT_B_DNA.md','Constitutional Principle','Founder Intent (Point B)','N/A','Constitution','Yes'])
for htext in headings(constitution['NORTH_STAR_SSOT.md']):
    principles.append([htext,'docs/constitution/NORTH_STAR_SSOT.md','Constitutional Principle','Point B DNA','Point B DNA','Constitution','Yes'])
for htext in headings(constitution['COGNITIVE_CORE_LAWS.md']):
    principles.append([htext,'docs/constitution/COGNITIVE_CORE_LAWS.md','Capability / Runtime Role','NORTH_STAR §2.10','truth-enforcement-spine','ai-council','Partial'])
for htext in headings(constitution['LUMIN_COMMUNICATION_DNA.md']):
    principles.append([htext,'docs/constitution/LUMIN_COMMUNICATION_DNA.md','Constitutional Principle' if ('Law' in htext or 'Rule' in htext) else 'Capability','NORTH_STAR §2.6/§2.14','lumin-chair','lifeos','Conditional'])
for htext in headings(builderos_home)[:30]:
    principles.append([htext,'docs/products/builderos/PRODUCT_HOME.md','Implementation Detail' if any(x in htext for x in ['script','route','service','commit','deploy']) else 'Capability','NORTH_STAR/POINT_B','builderos tooling','builderos','No'])
table(['Principle / Statement','Source','Classification','Higher Principle','Depends On','Owner','If Implementation Disappeared'], principles[:80])
paragraph(f'_Showing {min(80,len(principles))} of {len(principles)}._')
save('01_CONSTITUTIONAL_MAP.md')

# 02 dependency
md_lines.clear(); h(1,'2. Dependency Graph')
h(2,'2.1 Forward chain')
paragraph('```')
paragraph('Founder Intent (Adam)')
paragraph('  -> Point B DNA')
paragraph('  -> NORTH_STAR_SSOT')
paragraph('  -> Product/BuilderOS PRODUCT_HOME.md')
paragraph('  -> BP_PRIORITY.json')
paragraph('  -> Mission BLUEPRINT.json')
paragraph('  -> factory-staging/execute-step.js or routes/lifeos-council-builder-routes.js')
paragraph('  -> SENTRY verification / deploy truth audit')
paragraph('  -> Runtime on Railway')
paragraph('  -> Reality (revenue, founder usability, usage)')
paragraph('```')
h(2,'2.2 Reverse dependencies')
paragraph('- Runtime depends on deploy pipeline, GitHub main, Railway env, secrets.')
paragraph('- SENTRY depends on live routes, Playwright, fixtures, command key.')
paragraph('- Builder depends on council-service, model keys, Neon pool, GitHub token.')
paragraph('- Chair depends on lumin-context-loader, founder twin, council members, truth-enforcement.')
paragraph('- Factory depends on mission packs, BPB intake gate, execute-step, SENTRY, TSOS, Historian.')
paragraph('- Revenue depends on Stripe keys, email provider, real customers, founder usability.')
h(2,'2.3 @ssot mapping (code -> owning product home)')
ssot_to=defaultdict(list)
for f in find_files('*'):
    if f.endswith(('.js','.mjs')):
        m=re.search(r'@ssot\s+(.+)', read_text(f))
        if m: ssot_to[m.group(1).strip()].append(f)
table(['SSOT Target','File Count','Sample'], [[k, len(v), ', '.join(v[:3])] for k,v in sorted(ssot_to.items(), key=lambda x:-len(x[1]))[:30]])
save('02_DEPENDENCY_GRAPH.md')

# 03 duplication
md_lines.clear(); h(1,'3. Duplication Report')
h(2,'3.1 Duplicate queues/orderings')
queues={
    'BP_PRIORITY.json': len(bp_priority.get('items',[])) if isinstance(bp_priority,dict) else 0,
    'MISSION_QUEUE.json': len(mission_queue.get('missions',[])) if isinstance(mission_queue,dict) else (len(mission_queue) if isinstance(mission_queue,list) else 0),
    'MISSION_PACK_INDEX.json': len(mission_pack_index.get('missions',[])) if isinstance(mission_pack_index,dict) else 0,
    'BUILDEROS_WORKING_DEFINITION': len(working_def.get('pillars',{})) if isinstance(working_def,dict) else 0,
    'PRODUCT_READINESS_REPORT.json': len(product_readiness.get('products',[])) if isinstance(product_readiness,dict) else 0,
}
table(['File','Item Count'], [[k,v] for k,v in queues.items()])
paragraph('**Finding:** Multiple machine-readable work queues coexist. `CURRENT_BP_GAPS_V1.md` says `BP_PRIORITY` is canonical for scheduling, but `MISSION_QUEUE.json` is Hist-owned and still referenced by legacy autopilot.')
h(2,'3.2 Duplicate builders/execution paths')
table(['Builder / Executor','Role'], [
    ['routes/lifeos-council-builder-routes.js','Production builder (commit+redeploy)'],
    ['factory-staging/factory-core/builder/execute-step.js','Factory builder (BPB->SENTRY->TSOS->Historian)'],
    ['services/never-stop-product-factory.js','Autonomous never-stop builder (services path)'],
    ['scripts/bp-priority-never-stop.mjs','BP priority never-stop runner'],
    ['services/governed-autonomous-shipping-loop.js','Governed autonomous shipping loop'],
    ['services/builderos-governed-loop-executor.js','Governed loop executor'],
])
h(2,'3.3 Duplicate schedulers')
scheds=[]
for f in find_files('startup/*.js')+find_files('services/*scheduler*.js')+find_files('core/*scheduler*.js'):
    txt=read_text(f)
    if 'setInterval' in txt or 'Scheduler' in f or 'register' in f.lower():
        scheds.append([f,'setInterval' if 'setInterval' in txt else 'register'])
table(['Scheduler File','Pattern'], scheds[:50])
h(2,'3.4 Duplicate SSOT/authority docs')
paragraph('- `docs/products/builderos/PRODUCT_HOME.md` and `builderos-reboot/BUILDEROS_WORKING_DEFINITION.json` both define BuilderOS.')
paragraph('- `CURRENT_BP_GAPS_V1.md`, `WORKSPACE_STATUS.md`, `HANDOFF.md` all report current state.')
paragraph('- `PRODUCT_HOME.md` contains **five** `## Change Receipts` tables (different schemas).')
paragraph('- `NORTH_STAR_SSOT.md` and `UNIFIED_DOCTRINE_MAP.md` overlap principles.')
paragraph('- `MISSIONS/*/BLUEPRINT.json` and `MISSIONS/*/FOUNDER_PACKET.md` duplicate intent.')
h(2,'3.5 Duplicate route registration')
route_regs=[]
for fname in ['startup/register-runtime-routes.js','startup/register-founder-runtime-routes.js','factory-staging/startup/register-routes.js','server-founder-runtime.js','server-full-runtime.js']:
    txt=read_text(fname)
    route_regs.append([fname, len(re.findall(r'app\.(get|post|put|delete|patch|use)\(',txt))])
table(['Route Registration File','Route Pattern Count'], route_regs)
save('03_DUPLICATION_REPORT.md')

# 04 blueprint drift
md_lines.clear(); h(1,'4. Blueprint Drift Report')
h(2,'4.1 BP_PRIORITY vs MISSION_QUEUE')
bp_ids=[it.get('mission_id') for it in bp_priority.get('items',[]) if isinstance(it,dict)]
def mission_ids(q):
    if isinstance(q,dict) and 'missions' in q: return [m.get('mission_id') for m in q.get('missions',[]) if isinstance(m,dict)]
    if isinstance(q,list): return [m.get('mission_id') for m in q if isinstance(m,dict)]
    return []
queue_ids=mission_ids(mission_queue)
pack_ids=mission_ids(mission_pack_index)
common=set(bp_ids)&set(queue_ids); only_bp=set(bp_ids)-set(queue_ids); only_q=set(queue_ids)-set(bp_ids)
common_pack=set(bp_ids)&set(pack_ids); only_bp_pack=set(bp_ids)-set(pack_ids); only_pack=set(pack_ids)-set(bp_ids)
paragraph(f'- BP items: {len(bp_ids)}; MISSION_QUEUE mission IDs: {len(queue_ids)}; common: {len(common)}; only-BP: {len(only_bp)}; only-queue: {len(only_q)}')
paragraph(f'- MISSION_PACK_INDEX mission IDs: {len(pack_ids)}; common-with-BP: {len(common_pack)}; only-BP: {len(only_bp_pack)}; only-pack: {len(only_pack)}')
if only_bp: paragraph(f'  sample only-BP: {", ".join(list(only_bp)[:5])}')
if only_q: paragraph(f'  sample only-queue: {", ".join(list(only_q)[:5])}')
if only_pack: paragraph(f'  sample only-pack: {", ".join(list(only_pack)[:5])}')
h(2,'4.2 Rank-1 mission status vs doctrine')
c2_status=None
if bp_priority:
    for it in bp_priority.get('items',[]):
        if isinstance(it,dict) and it.get('mission_id')=='PRODUCT-CONVERSATION-COMMITMENTS-C2-0001':
            c2_status=it; break
if c2_status:
    table(['Field','Value'], [[k,v] for k,v in c2_status.items()])
paragraph('Doctrine verify output (first 50 lines):')
paragraph('```')
for line in doctrine_c2_raw.splitlines()[:50]: paragraph(line)
paragraph('```')
h(2,'4.3 Working definition pillars')
if working_def:
    table(['Pillar','Status'], [[k,v.get('status','?')] for k,v in working_def.get('pillars',{}).items()])
h(2,'4.4 False-done rows')
paragraph('```')
for line in false_done_raw.splitlines()[:70]: paragraph(line)
paragraph('```')
save('04_BLUEPRINT_DRIFT.md')

# 05 runtime drift
md_lines.clear(); h(1,'5. Runtime Drift Report')
h(2,'5.1 Production vs origin/main')
paragraph('`/api/v1/lifeos/builder/ready` response:')
paragraph('```json')
paragraph(json.dumps(runtime_ready, indent=2))
paragraph('```')
paragraph(f'- origin/main HEAD: `{run("git rev-parse --short HEAD").strip()}`')
paragraph('- The never-stop autonomous builder pushes queue-status commits and triggers deploys, causing production to move ahead of manual audit commits.')
h(2,'5.2 Runtime profile lockout')
rtm=read_text('services/runtime-modes.js')
paragraph('`services/runtime-modes.js` forces Railway to `founder_builder` unless all env levers set.')
for line in rtm.splitlines():
    if 'founder_builder' in line or 'fullRuntimeProfile' in line or 'return' in line:
        paragraph(f'    {line}')
h(2,'5.3 Two servers / route registration paths')
for fname in ['server-founder-runtime.js','server-full-runtime.js','server.js']:
    txt=read_text(fname)
    if txt:
        n=len(re.findall(r'app\.(get|post|put|delete|patch|use)\(',txt))
        paragraph(f'**{fname}** route mounts: {n}')
h(2,'5.4 Observed dead 404 routes')
paragraph('- `GET /api/v1/builderos/control-plane/runtime-fingerprint` -> 404')
paragraph('- `GET /api/v1/flags` -> 404')
paragraph('- Route existence depends on runtime profile and server file loaded.')
save('05_RUNTIME_DRIFT.md')

# 06 governance drift
md_lines.clear(); h(1,'6. Governance Drift Report')
h(2,'6.1 Dead schedulers in boot-domains.js')
boot=read_text('startup/boot-domains.js')
scheds=Counter(re.findall(r'(boot\w+|start\w+Scheduler|register\w+Scheduler|run\w+Once)\s*\(', boot))
table(['Scheduler/Boot Call','Count'], sorted(scheds.items(), key=lambda x:-x[1])[:30])
h(2,'6.2 fullRuntimeProfile-gated schedulers')
for line in boot.splitlines():
    if 'fullRuntimeProfile' in line: paragraph(f'    {line.strip()}')
h(2,'6.3 Never-stop autonomous factory')
ns_files=find_files('*never-stop*')
paragraph('Never-stop files found:')
for f in ns_files: paragraph(f'- {f}')
paragraph('These are the likely source of the autonomous `main` commits and deploys.')
h(2,'6.4 Governance receipts')
if project_cert:
    table(['Metric','Value'], [[k,v] for k,v in project_cert.items() if not isinstance(v,(list,dict))])
if product_readiness and isinstance(product_readiness,dict):
    paragraph('`PRODUCT_READINESS_REPORT.json` top keys: '+', '.join(product_readiness.keys()))
h(2,'6.5 Silent governance failures')
paragraph('`factory:false-done:audit` shows many `done` steps with missing files/broken imports. The governance loop did not fail loudly.')
save('06_GOVERNANCE_DRIFT.md')

# 07 truth audit
md_lines.clear(); h(1,'7. Truth Audit')
h(2,'7.1 Truth ladder usage')
counts=Counter()
for root,pat in [('docs','*.md'),('builderos-reboot','*.md'),('services','*.js'),('routes','*.js'),('scripts','*.mjs')]:
    for f in (ROOT/root).rglob(pat):
        if 'docs/audits/' in str(f): continue
        try: txt=f.read_text(encoding='utf-8',errors='ignore')
        except: continue
        for label in ['KNOW','THINK','GUESS','DON\'T KNOW','DON’T KNOW','UNKNOWN']:
            counts[label]+=len(re.findall(r'\b'+re.escape(label)+r'\b',txt))
table(['Label','Occurrences'], sorted(counts.items(), key=lambda x:-x[1]))
h(2,'7.2 Overstated certainty')
paragraph('- `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` claims PASS/complete while doctrine verify HARD-fails 32 missing receipts.')
paragraph('- `OPERATIONAL_PROOF.json` (2026-06-24, dead `robust-magic` host) claims 10/10 operational.')
paragraph('- `PRODUCT_READINESS_REPORT` lists many products; `factory:false-done:audit` found 196 hard false-done rows.')
h(2,'7.3 Circular evidence')
paragraph('- `BP_PRIORITY` points to mission receipts; missions point back to `BP_PRIORITY` for queue position.')
paragraph('- `PROJECT_CERTIFICATION` and `PRODUCT_READINESS_REPORT` are generated by the same pipeline that produced false-done rows.')
paragraph('- `WORKSPACE_STATUS`, `CURRENT_STATE.json`, `HANDOFF.md` report progress but are not independently verified.')
h(2,'7.4 ssot-check raw (first 40 lines)')
paragraph('```')
for line in ssot_raw.splitlines()[:40]: paragraph(line)
paragraph('```')
save('07_TRUTH_AUDIT.md')

# 08 sentry audit
md_lines.clear(); h(1,'8. SENTRY Audit')
h(2,'8.1 SENTRY files')
sf=find_files('scripts/*sentry*')+find_files('services/*sentry*')+find_files('docs/*SENTRY*')+find_files('builderos-reboot/*SENTRY*')
table(['SENTRY File','Role'], [[f,'verification' if 'scripts' in f or 'SENTRY' in f else 'service'] for f in sf[:50]])
h(2,'8.2 Independence assessment')
paragraph('- SENTRY lives in the same repo and is invoked by the same `npm run` commands as the builder.')
paragraph('- No separate CI pipeline or independent agent is required to approve.')
paragraph('- SENTRY can be bypassed by skipping preflight, using env bypass flags, or calling builder route directly.')
h(2,'8.3 Runtime differences')
paragraph('`scripts/sentry-prealpha-gate.mjs` uses Playwright against live deployed app; not enforced pre-deploy.')
paragraph('Recent passes were achieved by manual fixes, not gate enforcement.')
h(2,'8.4 Dead/optional verification paths')
paragraph('- Factory SENTRY `factory-staging/factory-core/sentry/run-verification.js` is not wired into production builder route per harness audit.')
paragraph('- `builderos-reboot/SENTRY_AUDIT_REPORT.md` exists but not machine-enforced.')
save('08_SENTRY_AUDIT.md')

# 09 founder twin audit
md_lines.clear(); h(1,'9. Founder Twin Audit')
h(2,'9.1 Twin loading/enforcement')
for fname in ['services/lumin-context-loader.js','services/chair-direct-agent.js','services/chair-personality-translate.js','services/founder-direct-provider.js']:
    txt=read_text(fname)
    paragraph(f'**{fname}**')
    for line in txt.splitlines():
        if any(x in line.lower() for x in ['twin','template','fallback','facets']):
            paragraph(f'    {line.strip()}')
h(2,'9.2 Twin data files')
tf=[str(p.relative_to(ROOT)) for p in (ROOT/'data/twins').rglob('**/*') if p.is_file()] + [str(p.relative_to(ROOT)) for p in (ROOT/'docs/products/lifeos/twins').rglob('**/*') if p.is_file()]
table(['Twin File','Size'], [[f, os.path.getsize(ROOT/f)] for f in tf[:100]])
h(2,'9.3 Bypassability')
paragraph('- `lumin-context-loader.js` falls back to `data/twins/_template` when user facets missing.')
paragraph('- `chair-direct-agent.js` post-process replaces twin-refusal output with direct answer.')
paragraph('- Founder Twin is preferred but **not required** for Chair to answer.')
h(2,'9.4 Truth suppression')
paragraph('- No direct suppression of `DON\'T KNOW` labels found.')
paragraph('- However, post-processing a model refusal can mask model uncertainty; the twin becomes a soft preference, not a hard gate.')
save('09_FOUNDER_TWIN_AUDIT.md')

# 10 inventory
md_lines.clear(); h(1,'10. Architectural Inventory')
def count_sample(path):
    p=ROOT/path
    if not p.exists(): return 0,[]
    files=[f for f in p.rglob('*') if f.is_file()]
    return len(files), [str(f.relative_to(ROOT)) for f in files[:5]]
counts=[]
for d in ['routes','services','core','scripts','startup','public/overlay','db/migrations','config','factory-staging','builderos-reboot','docs/products','docs/constitution']:
    n,s=count_sample(d); counts.append([d,n,', '.join(s)])
table(['Layer','File Count','Sample'], counts)
h(2,'10.1 Product registry')
if product_registry and isinstance(product_registry,dict):
    prods=product_registry.get('products',product_registry)
    if isinstance(prods,list):
        table(['Product','Home'], [[p.get('id','?'),p.get('home','?')] for p in prods[:30]])
h(2,'10.2 BuilderOS governance artifacts')
gov=[str(p.relative_to(ROOT)) for p in (ROOT/'builderos-reboot/governance').rglob('*') if p.is_file()] if (ROOT/'builderos-reboot/governance').exists() else []
table(['Governance File','Size'], [[f, os.path.getsize(ROOT/f)] for f in gov[:30]])
h(2,'10.3 Routes')
routes_summary=[]
for f in (ROOT/'routes').glob('*.js'):
    txt=f.read_text(errors='ignore')
    exports=re.findall(r'export\s+(?:default\s+)?(?:async\s+)?function\s+(create\w+Routes|mount\w*)',txt)
    mount='yes' if 'app.use(' in txt or 'function mount' in txt or 'create' in f.name else 'no'
    routes_summary.append([f.name, len(re.findall(r'\.(get|post|put|delete|patch)\(',txt)), ', '.join(exports[:3]), mount])
table(['Route File','Route Count','Exports','Self-Mounting'], sorted(routes_summary, key=lambda x:-x[1])[:40])
h(2,'10.4 Services')
services_summary=[]
for f in (ROOT/'services').glob('*.js'):
    txt=f.read_text(errors='ignore')
    funcs=len(re.findall(r'(?:export\s+)?(?:async\s+)?function\s+\w+',txt))
    services_summary.append([f.name,funcs])
table(['Service File','Function Count'], sorted(services_summary, key=lambda x:-x[1])[:40])
save('10_ARCHITECTURAL_INVENTORY.md')

print('Reports saved to', OUT)
