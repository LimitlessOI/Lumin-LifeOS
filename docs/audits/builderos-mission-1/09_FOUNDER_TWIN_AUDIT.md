
# 9. Founder Twin Audit

## 9.1 Twin loading/enforcement
**services/lumin-context-loader.js**
    * SYNOPSIS: Loads per-user twin + communication profile + recent learning for Lumin prompts.
    import { createLifeRETwinStore } from './lifere-twin-store.js';
    function loadTemplateBundle() {
    const dir = path.join(ROOT, 'data/twins/_template');
    const facets = {};
    facets[key] = readJsonSafe(path.join(dir, `${key}.json`));
    const present = CORE_KEYS.filter((k) => facets[k] != null);
    userHandle: '_template',
    ...facets,
    present_facets: present,
    template_fallback: true,
    function twinDir(userHandle) {
    return path.join(ROOT, 'data/twins/default', userHandle);
    function loadFacetFromDisk(userHandle, twinKey) {
    return readJsonSafe(path.join(twinDir(userHandle), `${twinKey}.json`));
    return readJsonSafe(path.join(twinDir(userHandle), 'modules', `${moduleKey}.json`));
    const dir = path.join(twinDir(userHandle), 'modules');
    const FOUNDER_TWIN_REQUIRED = ['_meta', 'personal', 'goal', 'operating_system', 'decision_identity'];
    export function isFounderTwinHardGated(userHandle = 'adam') {
    // Hard gating is DISABLED. The Chair must answer from available facts and template fallback.
    export function evaluateTwinGate(bundle, injectText = '') {
    const missing = FOUNDER_TWIN_REQUIRED.filter((k) => !bundle?.[k]);
    const injectOk = inject.includes('DIGITAL TWIN') && inject.length >= 400;
    if (missing.length) reason = `missing facets: ${missing.join(', ')}`;
    else if (!statusOk) reason = `twin status not ready (${status || 'null'})`;
    else if (!injectOk) reason = 'twin inject block missing or too thin';
    * Learn from a founder message into facet twin files (memory + decision_identity).
    const store = createLifeRETwinStore({ pool, logger });
    const memory = store.readTwin({ tenantId: 'default', userId: userHandle, twinKey: 'memory' }) || {
    schema: 'digital_twin_memory_v1',
    await store.writeTwin({
    twinKey: 'memory',
    const decision = store.readTwin({
    twinKey: 'decision_identity',
    schema: 'digital_twin_decision_identity_v1',
    await store.writeTwin({
    twinKey: 'decision_identity',
    const meta = store.readTwin({ tenantId: 'default', userId: userHandle, twinKey: '_meta' });
    await store.writeTwin({
    twinKey: '_meta',
    function formatTwinInjectBlock(bundle, { maxChars = 7000 } = {}) {
    `DIGITAL TWIN (${meta.display_name || bundle.userHandle || 'user'}) ` +
    `status=${meta.status || 'unknown'} template=${meta.template_version || '?'}`
    'RULES: Do not invent personal facts missing from this twin. ' +
    text = `${text.slice(0, maxChars)}\n\n[twin inject truncated]`;
    const twinStore = createLifeRETwinStore({ pool, logger });
    function readFacet(userHandle, twinKey) {
    const fromStore = twinStore.readTwin({ tenantId: 'default', userId: userHandle, twinKey });
    return loadFacetFromDisk(userHandle, twinKey);
    const fromStore = twinStore.readTwin({
    async function loadPersonalTwin(userHandle = 'adam') {
    const template = readJsonSafe(path.join(ROOT, 'data/twins/_template', 'personal.json'));
    return template;
    async function loadFullTwin(userHandle = 'adam') {
    const facets = {};
    facets[key] = readFacet(userHandle, key);
    const present = CORE_KEYS.filter((k) => facets[k] != null);
    ...facets,
    present_facets: present,
    async function getTwinInjectBlock(userHandle = 'adam', opts = {}) {
    let bundle = await loadFullTwin(userHandle);
    const template = loadTemplateBundle();
    if (!template?.personal && !template?._meta) return '';
    bundle = { ...template, userHandle, template_fallback: true };
    bundle._meta.fallback_reason = 'missing_core_facets';
    bundle._meta.fallback_source = 'template';
    return formatTwinInjectBlock(bundle, opts);
    async function getTwinGate(userHandle = 'adam') {
    const bundle = await loadFullTwin(userHandle);
    const inject = formatTwinInjectBlock(bundle);
    ...evaluateTwinGate(bundle, inject),
    hard_gated_for_user: isFounderTwinHardGated(userHandle),
    async function requireTwinOrThrow(userHandle = 'adam') {
    const gate = await getTwinGate(userHandle);
    if (isFounderTwinHardGated(userHandle) && !gate.ok) {
    const err = new Error(`TWIN_GATE_FAILED: ${gate.reason}`);
    err.code = 'TWIN_GATE_FAILED';
    err.twin_gate = gate;
    const twinBlock = await getTwinInjectBlock(userHandle);
    if (twinBlock) parts.push(twinBlock);
    loadPersonalTwin,
    loadFullTwin,
    getTwinInjectBlock,
    getTwinGate,
    requireTwinOrThrow,
    formatTwinInjectBlock,
    export { formatTwinInjectBlock, fieldValue, CORE_KEYS };
**services/chair-direct-agent.js**
    API / DB / files / twin / OBSERVATIONS → SYSTEM_FACTS (truth) → you speak those facts in human language matched to him. Translation is HOW you speak, not WHO you are. Never say you are a middleman, reception desk, or layer between him and "the real system."
    - Match THIS person's rhythm from personal_twin / lumin_context when present — not generic assistant voice.
    - DIGITAL TWIN AVAILABILITY: The personal_twin, lumin_context, and SYSTEM_FACTS may be partial or a template_fallback. NEVER refuse to answer, counsel, or act solely because a digital twin facet is missing or labeled template_fallback. Use whatever facts are present, answer from general knowledge when necessary, and only note a missing twin if Adam explicitly asks why it isn't loaded.
    - MANDATORY — NO TWIN REFUSALS: You must produce a real answer every turn. Outputting "I can't answer without your digital twin" or "missing facets" is forbidden. If the twin is incomplete, answer from the available facts and general knowledge.
    - Never invent capability. If no tool can do it this turn, say so and the smallest unblock (template/file/API). Do not pretend.
    const isGovernanceCounsel = /\b(governance|constitution|pipeline|separation of powers|digital twin|point a|point b|architect|factory|dual.?judge|honesty|blueprint law|not_on_blueprint|chair counsel|ratify)\b/i.test(message)
    ? { personal_twin: systemFacts?.personal_twin || null, lumin_context: systemFacts?.lumin_context || null }
    // If the model still emits a twin-refusal (despite prompt instructions), override it
    if (/can't answer|without your digital twin|missing facets|twin.not.loaded/i.test(rawText)) {
    const fallback = String(raw || '').trim();
    if (fallback) {
    const finalized = finalizeHumanReply(fallback, { commandRan, lastBuild, presenceMode: isPresenceTurn });
**services/chair-personality-translate.js**
    Your ONLY job: convert SYSTEM_FACTS (JSON from real APIs, database, files, digital twin) into natural prose.
    - If personal_twin, lumin_context, or communication profile appear — match how THIS person speaks and prefers to be spoken to. If they are missing or marked template_fallback, still answer from the user's actual words and the available facts; never refuse to respond because the twin is incomplete.
    - Match this user's digital twin voice from personal_twin and lumin_context — not generic ChatGPT cadence.
    - Match this user's twin/profile voice and tonal/emotional moment. Be direct.`;
    return formatFactsFallback(systemFacts);
    Answer the user's life/errand question directly using verified_search and personal_twin when present.
    const enforced = enforceCommunicationLaw(safe || formatFactsFallback(systemFacts), {
    : formatFactsFallback(systemFacts);
    return result.text || formatFactsFallback(systemFacts);
    return formatFactsFallback(systemFacts);
    export function formatFactsFallback(facts = {}) {
    // verified content is never lost to a generic fallback (SO-003 safety net).
**services/founder-direct-provider.js**
    import { refreshBuilderOsEnvFallback } from '../config/runtime-env.js';
    refreshBuilderOsEnvFallback();

## 9.2 Twin data files
| Twin File | Size |
|---|---|
| data/twins/README.md | 722 |
| data/twins/default/adam/personality.json | 642 |
| data/twins/default/adam/future.json | 372 |
| data/twins/default/adam/_meta.json | 2132 |
| data/twins/default/adam/goal.json | 4309 |
| data/twins/default/adam/communication.json | 1070 |
| data/twins/default/adam/memory.json | 1225 |
| data/twins/default/adam/operating_system.json | 6642 |
| data/twins/default/adam/permission.json | 1095 |
| data/twins/default/adam/performance.json | 170 |
| data/twins/default/adam/personal.json | 5865 |
| data/twins/default/adam/decision_identity.json | 6658 |
| data/twins/default/adam/modules/recruiting.json | 663 |
| data/twins/default/adam/modules/buyer.json | 4676 |
| data/twins/default/adam/modules/seller.json | 463 |
| data/twins/default/adam/modules/gvbn.json | 1630 |
| data/twins/default/adam/modules/lead.json | 3349 |
| data/twins/default/adam/modules/content.json | 1105 |
| data/twins/default/relationships/adam_sherry_marriage.json | 343 |
| data/twins/_template/personality.json | 190 |
| data/twins/_template/_meta.json | 356 |
| data/twins/_template/goal.json | 184 |
| data/twins/_template/communication.json | 272 |
| data/twins/_template/memory.json | 157 |
| data/twins/_template/operating_system.json | 261 |
| data/twins/_template/permission.json | 249 |
| data/twins/_template/personal.json | 535 |
| data/twins/_template/README.md | 238 |
| data/twins/_template/decision_identity.json | 331 |
| data/twins/founder/adam/adam.json | 686 |
| data/twins/founder/household/family.json | 108 |
| data/twins/founder/household/marriage.json | 221 |
| data/twins/founder/household/household.json | 108 |
| data/twins/founder/governance/founder.json | 185 |
| data/twins/founder/sherry/sherry.json | 164 |

## 9.3 Bypassability
- `lumin-context-loader.js` falls back to `data/twins/_template` when user facets missing.
- `chair-direct-agent.js` post-process replaces twin-refusal output with direct answer.
- Founder Twin is preferred but **not required** for Chair to answer.

## 9.4 Truth suppression
- No direct suppression of `DON'T KNOW` labels found.
- However, post-processing a model refusal can mask model uncertainty; the twin becomes a soft preference, not a hard gate.