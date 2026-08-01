/**
 * SYNOPSIS: Exports reviewBranch — services/final_pr_review.js.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */

// PR note: reviewBranch is intentionally disabled; any formal merge must go through the governed factory ship-queue.
/**
 * SECURITY: disabled on purpose, do not restore the previous implementation.
 * The prior body ran unsanitized shell git commands built from `branchName`
 * via template-string interpolation into execSync (`git checkout ${branchName}`,
 * `git merge ${branchName}`, ...) — a command-injection vulnerability — and,
 * even with a "safe" branch name, unconditionally ran `git merge` + `git push
 * origin main` directly against the live server's working tree with zero
 * review, zero SENTRY pass, zero pre-commit gate, and zero governance —
 * exactly the unrestrained self-merge path SO-001 (governed factory only for
 * server code, no self-merging) exists to prevent. There is no safe way to
 * keep this behavior by sanitizing the branch name alone; the design itself
 * (arbitrary HTTP-triggered git merge+push to prod main) is the violation.
 * If real PR review/merge automation is wanted, it must go through the
 * governed factory ship-queue (author_then_write) using the GitHub API, not
 * local `git` shell commands run against the server's own checkout.
 */
export function reviewBranch() {
  throw new Error(
    'reviewBranch is disabled: the previous implementation was a command-injection ' +
    'and ungoverned-self-merge vulnerability (unsanitized git checkout/merge/push via ' +
    'execSync). Do not re-enable without routing real PR review/merge through the ' +
    'governed factory ship-queue and the GitHub API instead of local shell git commands.'
  );
}
