# Phase 5 — Triage

**BUILD_NOW** — verifier/GAP-FILL path exists or doc-only safe in one slice.

| IDs | Rationale | Owner |
|-----|-----------|--------|
| **L03** ✅ | **`npm run lifeos:builder:digest`** — **shipped** `scripts/builder-operator-digest.mjs` + **`BUILDER_OPERATOR_ENV`** | system |
| **M02** ✅ | **`docs/projects/BUILDER_TAILWIND_EXIT_SPIKE.md`** — charter shipped; CSS swap still **NEXT** | Conductor |

**NEXT** — approved; queue after BUILD_NOW or needs thin spec.

| IDs | Rationale | Owner |
|-----|-----------|--------|
| **L02** | Tailwind CLI build + remove CDN — depends on **M02** spike acceptance | system `/build` + Conductor review |
| **L17–L19** | Overlay UX / density — product amendment lane | builder queue tasks |
| **L01** | Playwright golden — after **L02** stabilizes CSS | Conductor |
| **L04–L09** | Platform JSON / ready / replay — incremental PRs | system |
| **M06–M07** | `/ready` + gaps replay CLI | system |
| **L23–L25** | Operator meta-tools | NEXT quarter |

**MARKET_ICEBOX** — valuable; explicit deferral.

| IDs | Rationale |
|-----|-----------|
| **L12** | Semantic diff storage — needs DB shape + privacy review |
| **L14** | Rolling token budget — needs token accounting source of truth |
| **L24** | BranchPreview — nice; doc tooling backlog |

**DISCARD** — none this session (no discard-test violations).

**Vault pull:** Copy **NEXT** rows worth remembering into **`BUILDER_AUTONOMY_BRAINSTORM_VAULT.md`** when promoted.

**§2.12 note:** No load-bearing architecture fork in this triage — **`60_SYNTHESIS_COUNCIL.md`** not required.
