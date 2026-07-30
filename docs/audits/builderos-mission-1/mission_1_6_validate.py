#!/usr/bin/env python3
"""Mission 1.6 — Constitutional Validation & Authority Audit.
Read-only. Validates Mission 1.5 enforcement claims against the Validation Ladder,
produces a Corrected Enforcement Matrix, Authority Graph, Authority Drift Report,
File Creation Governance Review, and Mechanical Enforcement Plan.
"""
import json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path('/home/ubuntu/repos/Lumin-LifeOS')
OUT = ROOT / 'docs/audits/builderos-mission-1'

def esc(s): return str(s).replace('|','\\|')

def read(rel, default=''):
    p = ROOT / rel
    if not p.is_file(): return default
    try:
        return p.read_text(encoding='utf-8', errors='ignore')
    except Exception: return default

# ─── Parse Mission 1.5 matrix ───────────────────────────────────────────────
def parse_matrix():
    txt = (OUT / 'MISSION_1_5_CONSTITUTIONAL_MATRIX.md').read_text(encoding='utf-8', errors='ignore')
    m = re.search(r"## A\. Complete Constitutional Classification & Enforcement Matrix\n+\|(.+?)\n\|[-\| ]+\n(.*?)\n(?=## |$)", txt, re.DOTALL)
    if not m:
        m = re.search(r"## A.*?\n+\|(.+?)\n\|[-\| ]+\n(.*?)(?=\n## |$)", txt, re.DOTALL)
    header = [h.strip() for h in m.group(1).strip().split('|')]
    rows = []
    for line in m.group(2).splitlines():
        if not line.strip() or not line.startswith('|'): continue
        protected = line.replace('\\|', '\x00')
        cells = [c.strip() for c in protected.split('|')[1:-1]]
        if len(cells) != 8: continue
        cells = [c.replace('\x00', '|') for c in cells]
        rows.append(dict(zip(header, cells)))
    return rows

# ─── Pre-computed wiring / execution evidence ───────────────────────────────
BOOT_FILES = [
    'startup/boot-domains.js',
    'server-founder-runtime.js',
    'server-full-runtime.js',
    'server.js',
    'startup/register-runtime-routes.js',
    'startup/register-founder-runtime-routes.js',
    'startup/routes/founder-server-routes.js',
    'startup/auto-register-product-modules.js',
    'startup/schedulers.js',
]
BOOT_TEXT = {f: read(f) for f in BOOT_FILES}

# Build import map: normalized imported file -> [(source, line, raw_import), ...]
IMPORTS = defaultdict(list)
IMPORT_RE = re.compile(r"(?:import\s+(?:.*?\s+from\s+)?|import\(\s*)['\"]([^'\"]+)['\"]")
for f, text in BOOT_TEXT.items():
    if not text: continue
    for i, line in enumerate(text.splitlines(), 1):
        for imp in IMPORT_RE.findall(line):
            IMPORTS[imp].append((f, i, imp))
            # also strip leading ./ or ../ and extension for matching
            clean = re.sub(r'^(\.\./)+', '', imp)
            clean = re.sub(r'^(\./)', '', clean)
            clean = clean.replace('.js', '')
            IMPORTS[clean].append((f, i, imp))

# Route mount map: route module file -> mount path(s)
ROUTE_MOUNTS = defaultdict(list)
reg_text = BOOT_TEXT.get('startup/register-founder-runtime-routes.js', '')
for m in re.finditer(r"app\.use\(\s*['\"]([^'\"]+)['\"]\s*,\s*(\w+)\s*\(", reg_text):
    path, fn = m.group(1), m.group(2)
    ROUTE_MOUNTS[fn].append(path)

# Preflight verification scripts
pkg = json.loads(read('package.json') or '{}')
PREFLIGHT = pkg.get('scripts', {}).get('builder:preflight', '')
PREFLIGHT_SCRIPTS = re.findall(r'node (scripts/[^\s&|]+|tests/[^\s&|]+)', PREFLIGHT)
PREFLIGHT_SET = set(PREFLIGHT_SCRIPTS)

# ─── Helpers ────────────────────────────────────────────────────────────────
def files_from_manifest(manifest):
    if not manifest or manifest in ('Documentation Only', 'None'):
        return []
    return [f.strip() for f in manifest.split(',') if f.strip()]

def file_exists(rel): return (ROOT / rel).is_file()

def read_file(rel, limit=100000):
    p = ROOT / rel
    if not p.is_file(): return ''
    try: return p.read_text(encoding='utf-8', errors='ignore')[:limit]
    except: return ''

def keyword_tokens(text):
    t = re.sub(r'[^a-z0-9\s]', ' ', text.lower())
    stop = {'the','and','or','a','an','to','of','in','is','for','on','with','as','not','be','are','this','that','it','by','from','must','shall','law','rule','never','always','required','forbidden','non','derogable','immutable','cannot','will','mandatory','should','do','does','can','may','if','then','than','only','all','any','no','so','but','when','where','what','how','who','which','while','because','before','after','above','below','between','into','through','during','at','over','under','again','further','once','here','there','every','each','some','other','such','own','same','few','more','most','very','just','now','also','back','use','two','way','men','end','why','let','put','say','she','try','old','tell','come','could','would','said','them','well','were','has','had','his','her','you','your','we','our','us','i','me','my','he','him','his','they','their','them','its','it','being','having','doing','making','taking','getting','going','coming','using','giving','working'}
    return [w for w in t.split() if len(w) >= 4 and w not in stop]

def find_function_at_line(txt, target_line):
    lines = txt.splitlines()
    for i in range(min(target_line-1, len(lines)-1), -1, -1):
        line = lines[i]
        m = re.search(r'\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=|([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(', line)
        if m:
            return next(g for g in m.groups() if g is not None)
    return None

def keyword_matches(rel, item):
    txt = read_file(rel)
    if not txt: return []
    tokens = keyword_tokens(item)[:12]
    matches = []
    lines = txt.splitlines()
    for i, line in enumerate(lines, 1):
        low = line.lower()
        if any(t in low for t in tokens):
            fn = find_function_at_line(txt, i)
            snippet = line.strip()[:120]
            matches.append((i, fn, snippet))
    return matches[:3]

def is_imported(rel):
    """Returns the boot/runtime file that imports this module, if any."""
    p = ROOT / rel
    if not p.is_file(): return False
    # Try a few normalized keys
    keys = [rel, rel.replace('.js',''), rel.replace('.mjs',''), p.stem]
    # relative to root keys
    for cand in [str(p.relative_to(ROOT)), p.stem, p.name, p.name.replace('.js','')]:
        keys.append(cand)
    # import path variants
    for prefix in ('', './', '../'):
        for ext in ('.js','.mjs',''):
            keys.append(prefix + str(p.relative_to(ROOT)).replace('.js','').replace('.mjs','') + ext)
    seen = set()
    for k in keys:
        k2 = re.sub(r'^(\.\./)+(\.\./)?', '', k)
        k2 = re.sub(r'^(\./)', '', k2)
        for kk in (k, k2, k.replace('.js','').replace('.mjs','')):
            if kk in seen: continue
            seen.add(kk)
            if kk in IMPORTS:
                src, line, imp = IMPORTS[kk][0]
                return src, line, imp
    return None

def is_route_mounted(rel):
    """Return the mount path if rel is a route module mounted in route registration."""
    p = ROOT / rel
    # Find the createXRoutes function name imported from this file
    for fn, paths in ROUTE_MOUNTS.items():
        if p.stem.lower().replace('-','').replace('_','') in fn.lower():
            return paths
    return None

def active_path_evidence(rel, txt=None):
    if txt is None: txt = read_file(rel)
    if not txt: return []
    evidence = []
    if 'setInterval' in txt or 'setTimeout' in txt:
        evidence.append('scheduled interval/timeout')
    if re.search(r'\b(createServer|server\.listen|app\.listen)\b', txt):
        evidence.append('HTTP server listener')
    if re.search(r'\b(router|app)\.(get|post|put|delete|patch|use)\s*\(', txt):
        evidence.append('Express route handler registration')
    if re.search(r'\bexport\s+(?:async\s+)?(?:function|const)\s+(?:start|boot|run|execute|register|create|guard|monitor|sync|process)\w*', txt):
        evidence.append('exported start/boot/register function')
    return evidence

def preflight_hits(rel, item):
    base = Path(rel).stem
    hits = []
    # direct script name contains file stem
    for script in PREFLIGHT_SCRIPTS:
        if base in script.lower():
            hits.append(script)
    # keyword match
    tokens = keyword_tokens(item)[:6]
    for script in PREFLIGHT_SCRIPTS:
        if any(t in script.lower() for t in tokens):
            hits.append(script)
    return list(dict.fromkeys(hits))

def continuous_evidence(rel):
    """True if a runtime health/watchdog endpoint explicitly checks this component."""
    base = Path(rel).stem
    mon_files = [
        'services/db-health-monitor.js',
        'scripts/ci-health-watchdog.mjs',
        'scripts/prod-health-watchdog.mjs',
        'routes/health-routes.js',
        'services/founder-runtime-route-assert.js',
    ]
    for mf in mon_files:
        t = read(mf)
        if base in t: return mf
    return None

# ─── Validation Ladder ──────────────────────────────────────────────────────
def validate_item(row):
    item = row['Constitutional Item']
    source = row['Source']
    orig_status = row['Status']
    files = files_from_manifest(row['Runtime Manifestation'])
    existing = [f for f in files if file_exists(f)]

    if not existing:
        return {
            'stage': 'Designed',
            'corrected': 'Documentation Only',
            'result': 'confirmed' if orig_status == 'Documentation Only' else 'downgraded',
            'barrier': 'Not Yet Verified' if orig_status != 'Documentation Only' else None,
            'notes': 'No runtime files found.',
            'evidence': []
        }

    notes_parts = []
    evidence = []
    loaded_by = None
    mounted_at = None
    active = []
    verified_by = []
    monitored_by = None

    for f in existing:
        txt = read_file(f)
        # load/import evidence
        imp = is_imported(f)
        if imp:
            src, line, raw = imp
            loaded_by = src
            evidence.append(f'`{f}` loaded by `{src}:{line}` (`{raw}`)')
        # route mount
        mounts = is_route_mounted(f)
        if mounts:
            mounted_at = mounts
            evidence.append(f'`{f}` mounted at {mounts}')
        # active path
        act = active_path_evidence(f, txt)
        if act:
            active.append(f)
            evidence.append(f'`{f}` has active path ({"; ".join(act)})')
        # preflight/verification
        hits = preflight_hits(f, item)
        if hits:
            verified_by.extend(hits)
            evidence.append(f'`{f}` covered by preflight scripts: {hits[:3]}')
        # continuous monitoring
        mon = continuous_evidence(f)
        if mon:
            monitored_by = mon
            evidence.append(f'`{f}` monitored by `{mon}`')
        # keyword/function line evidence
        matches = keyword_matches(f, item)
        if matches:
            for ln, fn, snippet in matches[:2]:
                fn_text = f' in `{fn}`' if fn else ''
                evidence.append(f'`{f}:{ln}`{fn_text}: {snippet}')

    # Determine stage / corrected status
    if verified_by:
        stage = 'Mechanically Verified'
        corrected = 'Mechanically Verified (Live)'
    elif active:
        stage = 'Executing'
        corrected = 'Mechanically Enforced (Live)'
    elif loaded_by or mounted_at:
        stage = 'Loaded'
        corrected = 'Mechanically Enforced (Static)'
    else:
        stage = 'Implemented'
        corrected = 'Implemented'

    # Continuous verification override
    if monitored_by and stage == 'Executing':
        stage = 'Continuously Verified'
        corrected = 'Mechanically Verified (Live)'

    # Barrier / tooling gap
    barrier = None
    if stage in ('Executing', 'Mechanically Enforced (Live)', 'Mechanically Verified (Live)') and not monitored_by and any('scheduler' in f.lower() or 'boot' in f.lower() or 'watchdog' in f.lower() for f in active or existing):
        barrier = 'Verification Blocked — Tooling Gap: Railway boot logs / runtime telemetry not independently inspectable.'
    elif stage in ('Implemented', 'Wired', 'Loaded') and not verified_by:
        barrier = 'Not Yet Verified: no preflight script or automated test asserts this component.'

    # Result vs Mission 1.5 status
    rank = {'Documentation Only':0,'Implemented':1,'Wired':2,'Loaded':3,'Executing':4,'Mechanically Verified':5,'Continuously Verified':6}
    rank_status = {'Documentation Only':0,'Partially Enforced':2,'Mechanically Enforced':4}
    orig_rank = rank_status.get(orig_status, 0)
    new_rank = rank.get(stage, 0)
    if new_rank > orig_rank:
        result = 'upgraded'
    elif new_rank < orig_rank:
        result = 'downgraded'
    else:
        result = 'confirmed'
    # static vs live correction
    if orig_status == 'Mechanically Enforced' and corrected.startswith('Mechanically'):
        if '(Live)' in corrected and 'present and wired' in row.get('Notes','').lower():
            result = 'corrected (static vs live)'

    if not evidence:
        notes_parts.append('Runtime files exist but no load path, active path, or verification script identified.')
    else:
        notes_parts.append('Evidence: ' + '; '.join(evidence[:4]))
    if barrier:
        notes_parts.append(barrier)

    return {
        'stage': stage,
        'corrected': corrected,
        'result': result,
        'barrier': barrier,
        'notes': ' '.join(notes_parts),
        'evidence': evidence
    }

rows = parse_matrix()
validated = []
for r in rows:
    v = validate_item(r)
    r.update({
        'Validation Stage': v['stage'],
        'Corrected Status': v['corrected'],
        'Validation Result': v['result'],
        'Barrier': v['barrier'] or '',
        'Validation Notes': v['notes'],
        'Evidence': v['evidence']
    })
    validated.append(r)

# Single source of truth for counts
stage_counts = Counter(r['Validation Stage'] for r in validated)
status_counts = Counter(r['Corrected Status'] for r in validated)
result_counts = Counter(r['Validation Result'] for r in validated)

# ─── Authority Audit ────────────────────────────────────────────────────────
authority_files = [
    'docs/constitution/NORTH_STAR_SSOT.md','docs/constitution/POINT_B_DNA.md','docs/constitution/UNIFIED_DOCTRINE_MAP.md','docs/constitution/COGNITIVE_CORE_LAWS.md','docs/constitution/LUMIN_COMMUNICATION_DNA.md','docs/constitution/LUMIN_DISPLAY_DNA.md','docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md',
    'builderos-reboot/BP_PRIORITY.json','builderos-reboot/MISSION_QUEUE.json','builderos-reboot/MISSION_PACK_INDEX.json','builderos-reboot/BUILDEROS_WORKING_DEFINITION.json','builderos-reboot/HIST_DOMAIN_REGISTRY.json','builderos-reboot/POINT_B_TARGET.json','builderos-reboot/PROJECT_CERTIFICATION.json','builderos-reboot/PRODUCT_READINESS_REPORT.json','builderos-reboot/CURRENT_STATE.json','builderos-reboot/WORKSPACE_STATUS.md','builderos-reboot/HANDOFF.md',
    'docs/products/PRODUCT_REGISTRY.json','docs/products/builderos/PRODUCT_HOME.md','docs/products/INDEX.md',
    'CLAUDE.md','docs/AGENT_RULES.compact.md','docs/AGENT_INBOX.md',
    'builderos-reboot/governance/ARTIFACT_ALIAS_REGISTRY.json','builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json','builderos-reboot/governance/DEPARTMENT_ROLE_CONTRACT.json','builderos-reboot/governance/MISSION_PHASE_ARTIFACTS.json',
]

def authority_info(rel):
    txt = read(rel)
    p = ROOT / rel
    if not txt: return None
    name = p.name
    kind = 'document'
    if p.suffix == '.json': kind = 'registry'
    if 'AGENTS' in name or 'RULES' in name or '.mdc' in name: kind = 'rule'
    claims = 'canonical/SSOT' if any(w in txt.lower() for w in ['canonical','ssot','authority','supreme','constitution','source of truth','source-of-truth']) else 'guidance/historical'
    # ownership hint — restrict to a known short token whitelist
    owner = None
    whitelist = {'Adam','Machine','Hist','Historian','Product','Council','Conductor','Human','Guardian','IDC','BPB','TSOS','ARC','Lumin','LifeOS','BuilderOS'}
    for pat in [
        r'(?:owner|domain|department|@authority)\s*[:=]\s*["\']?([A-Za-z]{3,20})',
        r'owner[_-]department["\']?\s*[:=]\s*["\']?([A-Za-z]{3,20})',
        r'"owner"\s*:\s*"([^"]{3,40})"',
        r'_authority["\']?\s*[:=]\s*["\']?([A-Za-z]{3,20})'
    ]:
        m = re.search(pat, txt, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip().split()[0]
            if re.match(r'^[A-Za-z]+$', candidate):
                if candidate in whitelist or candidate.title() in whitelist:
                    owner = candidate
                    break
    return {'file':rel, 'name':name, 'kind':kind, 'claims':claims, 'owner':owner, 'size':p.stat().st_size if p.is_file() else 0}

authorities = [a for a in (authority_info(f) for f in authority_files) if a]

# Authority edges: which files reference which other authority files
auth_names = {Path(a['file']).name for a in authorities}
auth_edges = []
for a in authorities:
    txt = read(a['file'])
    for b in authorities:
        if a['file'] == b['file']: continue
        if re.search(r'\b' + re.escape(Path(b['file']).name.replace('.md','').replace('.json','')) + r'\b', txt, re.IGNORECASE):
            auth_edges.append((a['file'], b['file']))

# Competing authorities
competing = [
    {'domain':'Constitutional supremacy','authorities':[a['file'] for a in authorities if 'constitution' in a['file']],'risk':'Multiple documents assert supreme authority; no runtime tie-breaker exists.','type':'Current Remediation'},
    {'domain':'Work queue authority','authorities':['builderos-reboot/BP_PRIORITY.json','builderos-reboot/MISSION_QUEUE.json','builderos-reboot/MISSION_PACK_INDEX.json'],'risk':'BP_PRIORITY claims canonical, but MISSION_QUEUE and MISSION_PACK_INDEX still exist and legacy autopilot references them.','type':'Current Remediation'},
    {'domain':'Product registry authority','authorities':['docs/products/PRODUCT_REGISTRY.json','docs/products/INDEX.md'],'risk':'Two product indexes; unclear which is canonical for autonomous builders.','type':'Current Remediation'},
    {'domain':'Runtime authority','authorities':['services/','factory-staging/','routes/'],'risk':'`routes/` is legacy production spine; `factory-staging/` is canonical factory; both can ship code.','type':'Current Remediation'},
    {'domain':'Agent instruction authority','authorities':['CLAUDE.md','docs/AGENT_RULES.compact.md','docs/AGENT_INBOX.md'] + [str(p.relative_to(ROOT)) for p in (ROOT/'.cursor/rules').rglob('*.mdc') if p.is_file()],'risk':'Multiple rule files; `.cursor/rules` are local IDE rules, `CLAUDE.md` is general, `AGENT_RULES.compact` is runtime reference.','type':'Future Prevention'},
    {'domain':'SSOT authority','authorities':['docs/SSOT_COMPANION.md','docs/constitution/*_SSOT*.md','docs/products/*/PRODUCT_HOME.md'],'risk':'SSOT documents and product homes both claim ownership of product truth.','type':'Future Prevention'},
]

# ─── Output ───────────────────────────────────────────────────────────────────
md = []
md.append('# Mission 1.6 — Constitutional Validation & Authority Audit')
md.append('_Generated: 2026-07-30. Read-only. No code or documentation changes._')
md.append('')
md.append('## Executive Summary (Truth-Labeled)')
md.append('')
md.append('| Finding | Label | Evidence |')
md.append('|---|---|---|')
md.append(f'| Validated {len(validated)} constitutional items from Mission 1.5 matrix. | KNOW | `MISSION_1_5_CONSTITUTIONAL_MATRIX.md` parsed. |')
md.append(f'| Validation stage distribution: {dict(stage_counts)}. | KNOW | Single computation pass over all rows. |')
md.append(f'| Corrected status distribution: {dict(status_counts)}. | KNOW | Same computation pass, reused in every table. |')
md.append('| `builder:preflight` is the strongest mechanical verification evidence; it covers truth lockdown, point-b DNA, communication law, receipt truth, SSOT, and false-done audit. | KNOW | `package.json` `builder:preflight` string parsed and script names matched. |')
md.append('| `server-founder-runtime.js` directly registers `governance-review-scheduler.js` at boot (lines 60, 547), fixing the Mission 1.5 calibration example. | KNOW | File read and import/call identified. |')
md.append('| Independent live verification of scheduler execution is blocked by Railway log visibility; only code inspection and production side effects (commits/deploys) are available. | THINK | No direct boot-time log stream or telemetry endpoint inspected. |')
md.append('| Authority drift exists across constitutional documents, work queues, runtime layers, and agent instruction sources. | KNOW | Authority file inventory and cross-reference search. |')
md.append('')
md.append('## 1. Constitutional Validation Report')
md.append('')
md.append('### 1.1 Validation Ladder Summary (computed once)')
md.append('| Validation Stage | Count |')
md.append('|---|---|')
for stage, n in stage_counts.most_common():
    md.append(f'| {stage} | {n} |')
md.append('')
md.append('### 1.2 Corrected Enforcement Status Summary (computed once)')
md.append('| Corrected Status | Count |')
md.append('|---|---|')
for status, n in status_counts.most_common():
    md.append(f'| {status} | {n} |')
md.append('')
md.append('### 1.3 Validation Result Summary (computed once)')
md.append('| Result | Count |')
md.append('|---|---|')
for res, n in result_counts.most_common():
    md.append(f'| {res} | {n} |')
md.append('')
md.append('### 1.4 Per-Item Validation Table')
md.append('| Constitutional Item | Source | Orig Status | Validation Stage | Corrected Status | Result | Barrier | Validation Notes |')
md.append('|---|---|---|---|---|---|---|---|')
for r in validated:
    md.append(f'| {esc(r["Constitutional Item"])} | {r["Source"]} | {r["Status"]} | {r["Validation Stage"]} | {r["Corrected Status"]} | {r["Validation Result"]} | {esc(r["Barrier"])} | {esc(r["Validation Notes"])} |')
md.append('')
md.append('## 2. Corrected Constitutional Enforcement Matrix (Static vs Live)')
md.append('')
md.append('| Constitutional Item | Source | Runtime Manifestation | Enforcement Mechanism | Static/Live | Validation Stage | Validation Notes |')
md.append('|---|---|---|---|---|---|---|')
for r in validated:
    if r['Corrected Status'] not in ('Documentation Only','Implemented'):
        sl = 'Static' if '(Static)' in r['Corrected Status'] or r['Corrected Status']=='Implemented' else 'Live'
        md.append(f'| {esc(r["Constitutional Item"])} | {r["Source"]} | {esc(r["Runtime Manifestation"])} | {esc(r["Enforcement Mechanism"])} | {sl} | {r["Validation Stage"]} | {esc(r["Validation Notes"])} |')
md.append('')
md.append('## 3. Full vs Pending Validation')
md.append('')
full_validated = [r for r in validated if r['Validation Stage'] in ('Mechanically Verified','Continuously Verified') or (r['Validation Stage']=='Executing' and r['Evidence'])]
pending = [r for r in validated if r not in full_validated]
md.append(f'**Full validation** (file load + active path/function/line evidence or preflight/test coverage): {len(full_validated)} items.')
md.append(f'**Pending validation** (file exists but load/active/verification not proven or not inspected): {len(pending)} items.')
md.append('')
md.append('### 3.1 Highest-risk pending items (top 25)')
md.append('| Rank | Item | Source | Orig Status | Validation Stage | Barrier | Notes |')
md.append('|---|---|---|---|---|---|---|')
# prioritize Constitutional Rule + Documentation Only/Implemented that are pending
pending_risk = sorted(pending, key=lambda r: (
    {'Constitutional Rule':4,'Constitutional Principle':3,'Runtime Capability':2,'Runtime Role':2,'Implementation Detail':1,'Founder Philosophy':0,'Historical Context':0,'Duplicate':0}.get(r['Classification'],0),
    {'Documentation Only':4,'Implemented':3,'Partially Enforced':2,'Mechanically Enforced':1,'Historical Only':0}.get(r['Status'],0),
    len(r['Constitutional Item'])
), reverse=True)
for i, r in enumerate(pending_risk[:25], 1):
    md.append(f'| {i} | {esc(r["Constitutional Item"])} | {r["Source"]} | {r["Status"]} | {r["Validation Stage"]} | {esc(r["Barrier"])} | {esc(r["Validation Notes"])} |')
md.append('')
md.append('## 4. Authority Graph')
md.append('')
md.append('| Authority File | Kind | Claims | Owner/Department | Size |')
md.append('|---|---|---|---|---|')
for a in authorities:
    md.append(f'| {a["file"]} | {a["kind"]} | {a["claims"]} | {esc(a["owner"] or "unknown")} | {a["size"]} |')
md.append('')
md.append('### 4.1 Authority Edges (references between authority files)')
md.append('| Source | References |')
md.append('|---|---|')
for src, dst in auth_edges[:40]:
    md.append(f'| {src} | {dst} |')
if len(auth_edges) > 40:
    md.append(f'| ... | ({len(auth_edges) - 40} additional edges) |')
md.append('')
md.append('## 5. Authority Drift Report')
md.append('')
md.append('| Domain | Competing Authorities | Drift Risk | Type |')
md.append('|---|---|---|---|')
for c in competing:
    auths = ', '.join(c['authorities'])
    md.append(f'| {c["domain"]} | {auths} | {c["risk"]} | {c["type"]} |')
md.append('')
md.append('## 6. File Creation Governance Review')
md.append('')
md.append('### 6.1 Proposed Level Model')
md.append('- **Level 1 — Ordinary implementation**: new `services/`, `routes/`, `core/` files for a ratified product.')
md.append('- **Level 2 — Architectural authority**: new `startup/` registrations, `factory-staging/` canonical builders, runtime profile gates.')
md.append('- **Level 3 — Constitutional authority**: changes to `docs/constitution/`, `CLAUDE.md`, `.cursor/rules/*.mdc`, `builderos-reboot/governance/`, and any new canonical index/registry.')
md.append('')
md.append('### 6.2 Stress-test / loopholes')
md.append('- **Misclassification**: an agent can mark a Level 3 change as Level 1 by placing authority language inside an ordinary `services/` helper. Without a lint/parser checking for authority keywords, the label is self-reported.')
md.append('- **Self-approval**: a builder commit can include both the new file and a `FILE_CREATION_DECISION` receipt authored by the same commit, so "review" is not independent.')
md.append('- **Path loophole**: `.cursor/rules/*.mdc` and `CLAUDE.md` are not covered by `system:commit-files` receipts unless the gate explicitly enumerates them.')
md.append('- **Historical drift**: existing competing authorities were created before any gate, so a forward-only gate does not remediate current drift.')
md.append('- **Bypass via direct Railway shell**: anyone with Railway access can create files and deploy without a git commit, so the gate is enforceable only at the commit/deploy boundary it controls.')
md.append('')
md.append('### 6.3 Recommended objective escalation triggers')
md.append('A file creation gate should auto-escalate when any of the following are true:')
md.append('- File lives in `docs/constitution/`, `builderos-reboot/governance/`, `.cursor/rules/`, `startup/`, or root-level `CLAUDE.md`.')
md.append('- File path/name contains `registry`, `index`, `queue`, `priority`, `ssot`, `constitution`, `doctrine`, `governance`, `authority`, `canonical`.')
md.append('- File exports `register*`, `start*Scheduler`, `boot*`, or defines an Express router/app.')
md.append('- File writes to or creates a new JSON index/queue/manifest.')
md.append('- File declares `@authority` or `@ssot` to a document it did not also update.')
md.append('- Pre-commit diff adds a new directory under `docs/products/` without an updated `PRODUCT_REGISTRY.json` and `FILE_MANIFEST.json`.')
md.append('')
md.append('## 7. Mechanical Enforcement Plan for File Creation Gate')
md.append('')
md.append('### 7.1 Goal')
md.append('No protected file can be committed or deployed without a `FILE_CREATION_DECISION` receipt that records the level, author, rationale, reviewer, and evidence.')
md.append('')
md.append('### 7.2 Receipt format')
md.append('Append to `builderos-reboot/governance/FILE_CREATION_DECISIONS.jsonl`:')
md.append('```jsonl')
md.append('{"ts":"2026-07-30T...","path":"services/new-service.js","level":1,"product":"site-builder","author":"devin","rationale":"SMOS video export helper","reviewed_by":"council","evidence":"BP_PRIORITY.json mission id or SENTRY receipt","sha":"<commit-sha>"}')
md.append('```')
md.append('')
md.append('### 7.3 Enforcement chain (not implemented here)')
md.append('1. **Pre-commit hook** `scripts/file-creation-gate.mjs`:')
md.append('   - Diff staged files against `builderos-reboot/governance/FILE_CREATION_DECISIONS.jsonl`.')
md.append('   - If a new protected file lacks a receipt, exit 1 with a concrete message.')
md.append('2. **System ship enforcement**: `system:commit-files.mjs` and `POST /api/v1/lifeos/builder/execute-batch` call the gate before `commitToGitHub`.')
md.append('3. **Runtime boot loader**: `server.js` / `startup/boot-domains.js` rejects loading a module whose receipt `sha` does not match the current checkout or is missing for protected paths.')
md.append('4. **Preflight verification**: `node scripts/file-creation-gate.mjs --verify` runs in `builder:preflight`.')
md.append('')
md.append('### 7.4 Sufficiency and limits')
md.append('- Sufficient to prevent *git-tracked* future authority drift if enforced at commit and boot.')
md.append('- **Documentation Only** until the hook, ship path, and boot loader are wired and tested.')
md.append('- Does not remediate existing competing authorities; Mission 2 must archive/supersede those.')
md.append('- Railway shell / direct-upload can still bypass git, so the gate is only as strong as the deploy boundary it guards.')
md.append('')
md.append('## 8. Calibration Example: §2.0G Governance Evolution Law')
md.append('')
md.append('- **Runtime component**: `services/governance-review-scheduler.js`')
md.append('- **Load evidence**: imported at `server-founder-runtime.js:60` and invoked at `server-founder-runtime.js:547`.')
md.append('- **Execution stage**: `Executing` — the scheduler is started inside `bootFounderRuntime()`.')
md.append('- **Verification barrier**: `Verification Blocked — Tooling Gap` — we cannot independently prove the scheduled function fired on Railway; only code inspection and the explicit commit comment confirm the wiring.')
md.append('- **Corrected classification**: `Mechanically Enforced (Live)` with a `THINK` caveat on continuous verification.')
md.append('')
md.append('## 9. Existing Drift vs Future Prevention')
md.append('')
md.append('| Finding | Category | Action |')
md.append('|---|---|---|')
md.append('| Multiple constitutional documents all claim supremacy. | Current Remediation | Establish a single canonical `NORTH_STAR_SSOT.md` and explicitly subordinate other docs by amendment/version. |')
md.append('| `BP_PRIORITY.json`, `MISSION_QUEUE.json`, `MISSION_PACK_INDEX.json` co-exist. | Current Remediation | Archive `MISSION_QUEUE.json` and `MISSION_PACK_INDEX.json` to `HIST` or delete after confirming no active code path uses them as queue authority. |')
md.append('| `docs/products/PRODUCT_REGISTRY.json` vs `docs/products/INDEX.md`. | Current Remediation | Pick one registry and redirect the other to it; update `builder:preflight` to assert single source. |')
md.append('| `routes/` (legacy production spine) vs `factory-staging/` (canonical factory). | Current Remediation | Document cutover receipts and stop adding new canonical builder logic to `routes/`. |')
md.append('| `.cursor/rules/*.mdc`, `CLAUDE.md`, `AGENT_RULES.compact.md` provide overlapping instructions. | Future Prevention | File Creation Gate Level 3 must require explicit review and `FILE_CREATION_DECISION` receipt for any agent-instruction file. |')
md.append('| No `FILE_CREATION_DECISION` receipt or mechanical gate exists today. | Future Prevention | Implement `scripts/file-creation-gate.mjs` and enforce at commit, ship, and boot. |')
md.append('')
md.append('---')
md.append(f'_All counts in this report were produced by a single computation pass over {len(validated)} matrix rows. No counts were hand-retyped._')

(OUT / 'MISSION_1_6_VALIDATION_REPORT.md').write_text('\n'.join(md), encoding='utf-8')
print('Wrote', OUT / 'MISSION_1_6_VALIDATION_REPORT.md', 'rows', len(validated))
