<!-- SYNOPSIS: Governance / NSSOT / founder packet -->

# Governance / NSSOT / founder packet

**Session:** `a70380f7-8f58-4a21-ab97-85b1e7bf54c0` · **Archived:** 2026-04-07  
**Source:** `docs/conversation_dumps/raw/cursor-a70380f7-8f58-4a21-ab97-85b1e7bf54c0.jsonl`  
**Pairs in this bucket:** 1

---

## Exchange 23

**Adam / operator:**

[Image]
[Image attachment — see workspace assets/]
Now auto-set network status when payer name is extracted from the card — add a helper and call it during OCR merge:

Read clientcare-billing.js (lines 45-64)
Edit clientcare-billing.js
Added 5 lines
Now wire inferNetworkStatus into the OCR merge so it auto-sets when the card is read:

Edit clientcare-billing.js
Edit failed
Bash Find both occurrences
IN
grep -n "result.extracted.payer_name || lastInsuranceDraft.payer_name" public/clientcare-billing/clientcare-billing.js

OUT
326:            payer_name: result.extracted.payer_name || lastInsuranceDraft.payer_name,
3503:            payer_name: result.extracted.payer_name || lastInsuranceDraft.payer_name,
[rerun: b2]
Read clientcare-billing.js (lines 321-335)
Read clientcare-billing.js (lines 3498-3512)
Edit clientcare-billing.js
Added 4 lines
Edit clientcare-billing.js
Added 4 lines
Now remove coverage_active and auth_required from the "missing fields" warning lists:

Bash Find all remaining references to remove
IN
grep -n "coverage_active\|auth_required\|coverage status\|authorization status\|prior auth\|active coverage" public/clientcare-billing/clientcare-billing.js | grep -v "//\|snap\|read(" | head -20

OUT
57:    coverage_active: '',
59:    auth_required: '',
332:            coverage_active: '',
333:            auth_required: '',
810:      coverage_active: '',
812:      auth_required: '',
1519:      !String(lastInsuranceDraft.coverage_active || '').trim() && 'coverage status',
1521:      !String(lastInsuranceDraft.auth_required || '').trim() && 'authorization status',
1543:      !String(lastInsuranceDraft.coverage_active || '').trim() && 'active coverage (yes/no)',
1545:      !String(lastInsuranceDraft.auth_required || '').trim() && 'whether prior auth is required',
1559:      !String(lastInsuranceDraft.coverage_active || '').trim() && 'active coverage',
1561:      !String(lastInsuranceDraft.auth_required || '').trim() && 'prior authorization requirement',
1866:      !String(lastInsuranceDraft.coverage_active || '').trim() && 'coverage status',
1868:      !String(lastInsuranceDraft.auth_required || '').trim() && 'authorization status',
3436:        coverage_active: parseBool(draft.coverage_active || ''),
3438:        auth_required: parseBool(draft.auth_required || ''),
3466:          coverage_active: draft.coverage_active === 'true' ? true : draft.coverage_active === 'false' ? false : null,
3468:          auth_required: draft.auth_required === 'true' ? true : draft.auth_required === 'false' ? false : null,
3513:            coverage_active: '',
3514:            auth_required: '',
[rerun: b3]
Read clientcare-billing.js (lines 1516-1570)
Read clientcare-billing.js (lines 1861-1875)
Now I'll do all the missing-field list cleanups in one shot:

Edit clientcare-billing.js
Removed 3 lines
Edit clientcare-billing.js
Removed 3 lines
Edit clientcare-billing.js
Removed 3 lines
now is this using Client care to run a vob or not what is needed to make it so it give what info is needed and then dose a vob
Edit clientcare-billing.js
Removed 3 lines
Bash Syntax check
IN
node --check public/clientcare-billing/clientcare-billing.js 2>&1 && echo "OK"

OUT
OK
[rerun: b4]
Bash Commit and push
IN
python3 -c "
import re
with open('docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md', 'r') as f:
    content = f.read()
content = re.sub(r'\*\*Last Updated:\*\* 2026-04-06[^\n]*', '**Last Updated:** 2026-04-06 (coverage/auth removed as required fields; network defaults to out-of-network; Blue Shield/Cross auto-sets in-network; missing list trimmed to payer+member only)', content, count=1)
with open('docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md', 'w') as f:
    f.write(content)
" && git add public/clientcare-billing/clientcare-billing.js docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md && \
git commit -m "$(cat 
EOF
)" && git push origin main 2>&1

OUT
🔍 Pre-commit checks...
✅ Syntax check passed
[1m
🔍 SSOT Check — 13 changed file(s)
[0m
[32m✅ All changed files have up-to-date SSOT references.
[0m
✅ SSOT amendments current

[1mSSOT Coupling Check[0m [2m(staged changes)[0m
[2m──────────────────────────────────────────────────[0m
[2mChecking 13 file(s)...[0m

[31m✘ Coupling violations (6):[0m

  [31m✗[0m [1mAmendment docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md changed but manifest docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.manifest.json was not updated[0m
    [36mFix:[0m Update the amendment's "Last Updated" date and add a change receipt entry.

  [31m✗[0m [1mAmendment docs/projects/AMENDMENT_01_AI_COUNCIL.md changed but manifest docs/projects/AMENDMENT_01_AI_COUNCIL.manifest.json was not updated[0m
    [36mFix:[0m Update the amendment's "Last Updated" date and add a change receipt entry.

  [31m✗[0m [1mAmendment docs/projects/AMENDMENT_04_AUTO_BUILDER.md changed but manifest docs/projects/AMENDMENT_04_AUTO_BUILDER.manifest.json was not updated[0m
    [36mFix:[0m Update the amendment's "Last Updated" date and add a change receipt entry.

  [31m✗[0m [1mAmendment docs/projects/AMENDMENT_12_COMMAND_CENTER.md changed but manifest docs/projects/AMENDMENT_12_COMMAND_CENTER.manifest.json was not updated[0m
    [36mFix:[0m Update the amendment's "Last Updated" date and add a change receipt entry.

  [31m✗[0m [1mAmendment docs/projects/AMENDMENT_17_TC_SERVICE.md changed but manifest docs/projects/AMENDMENT_17_TC_SERVICE.manifest.json was not updated[0m
    [36mFix:[0m Update the amendment's "Last Updated" date and add a change receipt entry.

  [31m✗[0m [1mAmendment docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md changed but manifest docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.manifest.json was not updated[0m
    [36mFix:[0m Update the amendment's "Last Updated" date and add a change receipt entry.

[33m(--warn-only mode: exiting 0)[0m

✅ Pre-commit checks complete
[main 292126ab] fix: remove coverage/auth as required VOB fields; auto-set network
 2 files changed, 25 insertions(+), 41 deletions(-)
[1m
🔍 SSOT Check — 11 changed file(s)
[0m
[32m✅ All changed files have up-to-date SSOT references.
[0m
To https://github.com/LimitlessOI/Lumin-LifeOS.git
   15a619e2..292126ab  main -> main
[rerun: b5]
Pushed. Now to your question — yes, it uses ClientCare to run the VOB, but there are two separate flows and it sounds like the confusion is which one does what:

Flow 1 — "Run VOB ↗" button (right sidebar)
This is an AI estimate only. It uses the payer name + member ID to look up historical payment patterns and gives you a take/review/don't-schedule recommendation. It does NOT log into ClientCare. It's useful for a quick pre-screening decision.

Flow 2 — "Run full ClientCare flow" (green panel, scroll down)
This is the real VOB. It:

Takes the card data (payer + member ID)
Logs into ClientCare under your credentials
Fills those fields into the patient's billing page
Clicks ClientCare's own VOB/eligibility button
Waits for the response
Reads back what ClientCare returned
Posts a billing note
To use Flow 2 you need:

Card dropped → OCR reads payer + member ID ✓
Select the right client from the billing board (or confirm from the candidate list)
Scroll to the green "ClientCare — one run" panel → click "Run full ClientCare flow"
That's the one that actually does the VOB inside ClientCare. Want me to make that button more prominent and closer to the card drop zone so the path is clearer?

image.png
1140×907
look sure ad f that the card images are uploaded but its asking for it anyway
The card IS read correctly — Cigna, U90474268 01, group 3344292, network already set to Out of network.

Coverage status and Authorization are still showing because that's the old JS — my last push that removed them is queued for deployment but Railway hasn't served it yet (still catching up from the earlier incident).

Once Railway deploys, those two dropdowns will be gone entirely. Network will stay (alre

…[user message truncated]

**Assistant:**

Working through the codebase to fix VOB flow: auto-select the correct client when the card's subscriber doesn't match the selection, clarify the two VOB paths, and ensure the ClientCare pipeline path is reliable.

[REDACTED]

---
